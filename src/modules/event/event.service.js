const db = require('../../database/db');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { formatVND } = require('./event.date');

/**
 * Save or update QR Template configuration in Database
 */
function saveQrTemplate(imagePath, coords = { x: 225, y: 400, width: 450, height: 450, angle: 0 }) {
  const existing = db.prepare('SELECT id FROM qr_templates ORDER BY id DESC LIMIT 1').get();
  const angle = typeof coords.angle === 'number' ? coords.angle : 0;

  if (existing) {
    db.prepare(`
      UPDATE qr_templates
      SET image_path = ?, x = ?, y = ?, width = ?, height = ?, angle = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(imagePath, coords.x, coords.y, coords.width, coords.height, angle, existing.id);
  } else {
    db.prepare(`
      INSERT INTO qr_templates (image_path, x, y, width, height, angle)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(imagePath, coords.x, coords.y, coords.width, coords.height, angle);
  }
}


/**
 * Get active QR Template configuration
 */
function getQrTemplate() {
  return db.prepare('SELECT * FROM qr_templates ORDER BY id DESC LIMIT 1').get();
}

/**
 * Create a new event record in DB
 */
function createEvent({ title, rules, price, donateDeadline, roleDeadline, channelId, roleId }) {
  const stmt = db.prepare(`
    INSERT INTO events (title, rules, price, donate_deadline, role_deadline, channel_id, role_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);
  const info = stmt.run(
    title,
    rules,
    price,
    donateDeadline,
    roleDeadline,
    channelId || env.eventChannelId,
    roleId || env.eventRoleId
  );

  return getEventById(info.lastInsertRowid);
}

/**
 * Get event by ID
 */
function getEventById(id) {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

/**
 * Get currently active open event (for joining/payment matching)
 */
function getActiveEvent() {
  const nowIso = new Date().toISOString();
  return db.prepare(`
    SELECT * FROM events 
    WHERE status = 'ACTIVE' AND datetime(donate_deadline) > datetime(?)
    ORDER BY id DESC LIMIT 1
  `).get(nowIso);
}

/**
 * Get all events that have not fully ended
 */
function getNonEndedEvents() {
  return db.prepare("SELECT * FROM events WHERE status != 'ENDED' ORDER BY id DESC").all();
}

/**
 * Update event message ID (after posting to Discord channel)
 */
function updateEventMessageId(eventId, messageId) {
  db.prepare('UPDATE events SET message_id = ? WHERE id = ?').run(messageId, eventId);
}

/**
 * Update event status
 */
function updateEventStatus(eventId, status) {
  db.prepare('UPDATE events SET status = ? WHERE id = ?').run(status, eventId);
}

/**
 * Check if a user has already paid/participated in an event
 */
function hasUserJoined(eventId, userId) {
  const row = db.prepare('SELECT id FROM event_participants WHERE event_id = ? AND user_id = ?').get(eventId, userId);
  return !!row;
}

/**
 * Process SePay Payment Success webhook
 */
async function processPaymentSuccess({ transactionId, userId, amount, transferContent, client }) {
  // 1. Check idempotency (duplicate transaction)
  if (transactionId) {
    const existingTx = db.prepare('SELECT id FROM transactions WHERE transaction_id = ?').get(transactionId.toString());
    if (existingTx) {
      logger.warn(`Transaction ${transactionId} already processed. Skipping duplicate.`);
      return { success: true, duplicate: true, message: 'Transaction already processed' };
    }
  }

  // 2. Find matching active event
  let event = getActiveEvent();
  if (!event) {
    // If no active registration event, find latest non-ended event
    event = db.prepare("SELECT * FROM events WHERE status != 'ENDED' ORDER BY id DESC LIMIT 1").get();
  }
  if (!event) {
    // If all events are closed/ended, fallback to the latest event created
    event = db.prepare("SELECT * FROM events ORDER BY id DESC LIMIT 1").get();
  }

  if (!event) {
    logger.warn(`Payment received for user ${userId} (${amount} VND), but no event found in DB.`);
    return { success: false, error: 'No event found' };
  }

  // 3. Validate amount
  if (amount < event.price) {
    logger.warn(`Payment for user ${userId} is insufficient: ${amount} < ${event.price}`);
    return { success: false, error: `Số tiền thanh toán (${amount} VNĐ) nhỏ hơn giá vé (${event.price} VNĐ)` };
  }

  // 4. Save transaction to Database
  db.prepare(`
    INSERT INTO transactions (transaction_id, event_id, user_id, amount, transfer_content)
    VALUES (?, ?, ?, ?, ?)
  `).run(transactionId ? transactionId.toString() : null, event.id, userId, amount, transferContent);

  // 5. Save participant
  db.prepare(`
    INSERT INTO event_participants (event_id, user_id, status)
    VALUES (?, ?, 'ACTIVE')
    ON CONFLICT(event_id, user_id) DO UPDATE SET status = 'ACTIVE'
  `).run(event.id, userId);

  // 6. Assign Role to Member on Discord
  const guildId = env.guildId;
  const roleId = event.role_id || env.eventRoleId;

  let roleAssigned = false;
  let memberObj = null;

  try {
    const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId));
    if (guild) {
      memberObj = await guild.members.fetch(userId).catch(() => null);
      if (memberObj && roleId) {
        await memberObj.roles.add(roleId);
        roleAssigned = true;
        logger.info(`✅ Successfully assigned Role <${roleId}> to User <${userId}> for Event #${event.id}`);
      } else if (!memberObj) {
        logger.warn(`User ${userId} not found in guild ${guildId}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to assign role ${roleId} to user ${userId}`, err);
  }

  // 7. Send DM notification to user
  try {
    const discordUser = memberObj?.user || (await client.users.fetch(userId).catch(() => null));
    if (discordUser) {
      const dmEmbed = new EmbedBuilder()
        .setTitle('🎉 XÁC NHẬN THANH TOÁN THÀNH CÔNG!')
        .setDescription(
          `Chào **${discordUser.username}**, hệ thống đã ghi nhận thanh toán của bạn cho sự kiện **${event.title}**!`
        )
        .setColor(0x10b981)
        .addFields(
          { name: '🎫 Sự kiện', value: event.title, inline: true },
          { name: '💵 Số tiền đã thanh toán', value: formatVND(amount), inline: true },
          { name: '🎭 Trạng thái Role', value: roleAssigned ? `Đã cấp Role <@&${roleId}>` : 'Đang chờ cập nhật', inline: true },
          { name: '📝 Thể lệ & Quyền lợi', value: event.rules.length > 500 ? `${event.rules.substring(0, 497)}...` : event.rules, inline: false }
        )
        .setFooter({ text: 'Cảm ơn bạn đã tham gia sự kiện! • Vaxloz Bot' })
        .setTimestamp();

      await discordUser.send({ embeds: [dmEmbed] });
      logger.info(`Sent payment confirmation DM to User ${userId}`);
    }
  } catch (err) {
    logger.warn(`Could not send DM to user ${userId}: ${err.message}`);
  }

  return { success: true, eventId: event.id, userId, amount };
}

/**
 * Background routine to close expired donations
 */
async function checkAndCloseDonations(client, createPublicMessageFn) {
  const nowIso = new Date().toISOString();
  const expiredEvents = db.prepare(`
    SELECT * FROM events 
    WHERE status = 'ACTIVE' AND datetime(donate_deadline) <= datetime(?)
  `).all(nowIso);

  for (const event of expiredEvents) {
    logger.info(`Closing registration for Event #${event.id} (${event.title})`);
    updateEventStatus(event.id, 'CLOSED_REGISTRATION');
    event.status = 'CLOSED_REGISTRATION';

    // Update Discord public message
    if (event.channel_id && event.message_id) {
      try {
        const channel = await client.channels.fetch(event.channel_id).catch(() => null);
        if (channel) {
          const message = await channel.messages.fetch(event.message_id).catch(() => null);
          if (message) {
            const ui = createPublicMessageFn(event);
            await message.edit(ui);
            logger.info(`Updated Discord message for Event #${event.id} to [ĐÃ ĐÓNG ĐĂNG KÝ]`);
          }
        }
      } catch (err) {
        logger.error(`Failed to update message for Event #${event.id}`, err);
      }
    }
  }
}

/**
 * Background routine to end events and revoke roles
 */
async function checkAndEndEvents(client, createPublicMessageFn) {
  const nowIso = new Date().toISOString();
  const eventsToEnd = db.prepare(`
    SELECT * FROM events 
    WHERE status IN ('ACTIVE', 'CLOSED_REGISTRATION') AND datetime(role_deadline) <= datetime(?)
  `).all(nowIso);

  for (const event of eventsToEnd) {
    logger.info(`Ending Event #${event.id} (${event.title}) and revoking roles`);
    updateEventStatus(event.id, 'ENDED');
    event.status = 'ENDED';

    // Revoke roles from participants
    const participants = db.prepare(`
      SELECT user_id FROM event_participants 
      WHERE event_id = ? AND status = 'ACTIVE'
    `).all(event.id);

    const guildId = env.guildId;
    const roleId = event.role_id || env.eventRoleId;

    try {
      const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId));
      if (guild && roleId) {
        for (const p of participants) {
          try {
            const member = await guild.members.fetch(p.user_id).catch(() => null);
            if (member && member.roles.cache.has(roleId)) {
              await member.roles.remove(roleId);
              logger.info(`Revoked role ${roleId} from user ${p.user_id} for ended Event #${event.id}`);
            }
          } catch (mErr) {
            logger.warn(`Failed to revoke role for user ${p.user_id}: ${mErr.message}`);
          }
        }
      }
    } catch (err) {
      logger.error(`Failed to fetch guild ${guildId} to revoke event roles`, err);
    }

    // Mark participants as REVOKED in DB
    db.prepare("UPDATE event_participants SET status = 'REVOKED' WHERE event_id = ?").run(event.id);

    // Update public embed message in Discord
    if (event.channel_id && event.message_id) {
      try {
        const channel = await client.channels.fetch(event.channel_id).catch(() => null);
        if (channel) {
          const message = await channel.messages.fetch(event.message_id).catch(() => null);
          if (message) {
            const ui = createPublicMessageFn(event);
            await message.edit(ui);
            logger.info(`Updated Discord message for Event #${event.id} to [SỰ KIỆN ĐÃ KẾT THÚC]`);
          }
        }
      } catch (err) {
        logger.error(`Failed to update ended message for Event #${event.id}`, err);
      }
    }
  }
}

module.exports = {
  saveQrTemplate,
  getQrTemplate,
  createEvent,
  getEventById,
  getActiveEvent,
  getNonEndedEvents,
  updateEventMessageId,
  updateEventStatus,
  hasUserJoined,
  processPaymentSuccess,
  checkAndCloseDonations,
  checkAndEndEvents,
};
