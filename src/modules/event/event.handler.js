const { AttachmentBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');
const eventService = require('./event.service');
const { parseVietnamDate, formatVND } = require('./event.date');
const { generateEventQrImage, detectUniversalQrBoxWithAngle, TEMPLATE_DIR } = require('./event.qr');
const { createEventModal, createEventPublicMessage, createPaymentEmbed } = require('./event.ui');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { handleError } = require('../../utils/errorHandler');

/**
 * Handle /event qr [template_image] [coords...]
 */
async function handleEventQrCommand(interaction) {
  try {
    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
      return await interaction.reply({
        content: '❌ Bạn cần quyền **Administrator** để sử dụng lệnh này!',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const attachment = interaction.options.getAttachment('template_image');
    let qrX = interaction.options.getInteger('qr_x');
    let qrY = interaction.options.getInteger('qr_y');
    let qrWidth = interaction.options.getInteger('qr_width');
    let qrHeight = interaction.options.getInteger('qr_height');
    let qrAngle = 0;

    if (!attachment || !attachment.contentType?.startsWith('image/')) {
      return await interaction.editReply({
        content: '❌ Vui lòng tải lên một tệp hình ảnh hợp lệ (PNG, JPG, WEBP)!',
      });
    }

    // Download image
    const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    // Auto-trim transparent borders if any
    let processedBuffer = imageBuffer;
    try {
      processedBuffer = await sharp(imageBuffer)
        .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
        .png()
        .toBuffer();
    } catch {
      processedBuffer = imageBuffer;
    }

    // Save template to disk
    const filename = `template_custom_${Date.now()}.png`;
    const targetFilePath = path.join(TEMPLATE_DIR, filename);
    const metadata = await sharp(processedBuffer).metadata();
    await sharp(processedBuffer).png().toFile(targetFilePath);

    let isAutoDetected = false;

    // If user did not provide manual coordinates, run Universal Geometric Box & Angle Detection
    if (qrX === null || qrY === null || qrWidth === null || qrHeight === null) {
      const detected = await detectUniversalQrBoxWithAngle(processedBuffer);
      qrX = Math.round(detected.centerX - detected.size / 2);
      qrY = Math.round(detected.centerY - detected.size / 2);
      qrWidth = detected.size;
      qrHeight = detected.size;
      qrAngle = detected.angle || 0;
      isAutoDetected = true;
    }

    const coords = { x: qrX, y: qrY, width: qrWidth, height: qrHeight, angle: qrAngle };
    eventService.saveQrTemplate(targetFilePath, coords);

    const embed = new EmbedBuilder()
      .setTitle('✅ ĐÃ LƯU TEMPLATE QR THÀNH CÔNG')
      .setDescription(
        isAutoDetected
          ? '🎯 Hệ thống đã **tự động quét tìm khung và đo độ nghiêng**, xoay mã QR khớp 100% với nét vẽ!'
          : 'Ảnh template sự kiện đã được lưu và cập nhật toạ độ theo cấu hình của bạn.'
      )
      .setColor(0x10b981)
      .addFields(
        { name: '📐 Kích thước ảnh gốc', value: `${metadata.width} x ${metadata.height} px`, inline: true },
        { name: '📍 Toạ độ QR (X, Y)', value: `(${coords.x}, ${coords.y})`, inline: true },
        { name: '📏 Kích thước QR (W, H)', value: `${coords.width} x ${coords.height} px`, inline: true },
        { name: '🔄 Góc nghiêng tự động', value: `${coords.angle}°`, inline: true },
        { name: '💡 Xem thử kết quả', value: 'Gõ lệnh `/event preview` để xem trực tiếp ảnh mã QR đã ghép.', inline: false }
      )
      .setFooter({ text: 'Vaxloz Event Manager • Universal Geometric Detector' })
      .setTimestamp();


    await interaction.editReply({
      embeds: [embed],
    });

  } catch (error) {
    await handleError(interaction, error, 'Lỗi khi lưu ảnh template QR');
  }
}

/**
 * Handle /event open
 */
async function handleEventOpenCommand(interaction) {
  try {
    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
      return await interaction.reply({
        content: '❌ Bạn cần quyền **Administrator** để sử dụng lệnh này!',
        ephemeral: true,
      });
    }

    const modal = createEventModal();
    await interaction.showModal(modal);
  } catch (error) {
    await handleError(interaction, error, 'Không thể mở form tạo sự kiện');
  }
}

/**
 * Handle /event preview [amount]
 */
async function handleEventPreviewCommand(interaction) {
  try {
    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
      return await interaction.reply({
        content: '❌ Bạn cần quyền **Administrator** để sử dụng lệnh này!',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const amount = interaction.options.getInteger('amount') || 50000;
    const qrTemplate = eventService.getQrTemplate();

    console.log('[QR Generator] Rendering new dynamic QR for user:', interaction.user.id);

    const transferContent = `VAX ${interaction.user.id}`;
    const imageBuffer = await generateEventQrImage({
      bankAccount: env.sepay.bankAccount,
      bankCode: env.sepay.bankCode,
      amount,
      content: transferContent,
      templatePath: qrTemplate?.image_path,
    });

    const attachmentName = `preview_qr_${interaction.user.id}.png`;
    const attachment = new AttachmentBuilder(imageBuffer, { name: attachmentName });

    const embed = new EmbedBuilder()
      .setTitle('🔍 XEM TRƯỚC ẢNH QR THANH TOÁN (PREVIEW MODE)')
      .setDescription('Đây là bản xem trước ảnh ghép VietQR tự động xoay góc và căn tâm chuẩn xác bằng Sharp.')
      .setColor(0x3b82f6)
      .addFields(
        { name: '💵 Số tiền demo', value: `\`${formatVND(amount)}\``, inline: true },
        { name: '🏦 Thông tin SePay', value: `Ngân hàng: **${env.sepay.bankCode || 'N/A'}** | STK: \`${env.sepay.bankAccount || 'N/A'}\` | Chủ TK: **${env.sepay.accountName || 'N/A'}**`, inline: false },
        { name: '✨ Thuật toán ghép', value: 'Dynamic Rotated Bounding Box & Centroid Detection', inline: false }
      )
      .setImage(`attachment://${attachmentName}`)
      .setFooter({ text: 'Preview chỉ hiển thị cho bạn • Vaxloz Event Manager' })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
    });
  } catch (error) {
    await handleError(interaction, error, 'Lỗi khi tạo ảnh xem trước QR');
  }
}


/**
 * Handle Modal Submit (modal_event_create)
 */
async function handleEventModalSubmit(interaction) {
  try {
    const title = interaction.fields.getTextInputValue('event_title').trim();
    const rules = interaction.fields.getTextInputValue('event_rules').trim();
    const rawPrice = interaction.fields.getTextInputValue('event_price').trim();
    const rawDonateDeadline = interaction.fields.getTextInputValue('donate_deadline').trim();
    const rawRoleDeadline = interaction.fields.getTextInputValue('role_deadline').trim();

    // 1. Validate price
    const price = parseInt(rawPrice.replace(/[^0-9]/g, ''), 10);
    if (isNaN(price) || price <= 0) {
      return await interaction.reply({
        content: '❌ Giá vé không hợp lệ! Vui lòng nhập số tiền hợp lệ lớn hơn 0.',
        ephemeral: true,
      });
    }

    // 2. Validate donate deadline
    const parsedDonate = parseVietnamDate(rawDonateDeadline);
    if (!parsedDonate.valid) {
      return await interaction.reply({
        content: `❌ Lỗi hạn chót donate: ${parsedDonate.error}`,
        ephemeral: true,
      });
    }

    // 3. Validate role deadline
    const parsedRole = parseVietnamDate(rawRoleDeadline);
    if (!parsedRole.valid) {
      return await interaction.reply({
        content: `❌ Lỗi hạn chót sự kiện: ${parsedRole.error}`,
        ephemeral: true,
      });
    }

    // 4. Ensure role_deadline >= donate_deadline
    if (parsedRole.dayjs.isBefore(parsedDonate.dayjs)) {
      return await interaction.reply({
        content: '❌ Hạn kết thúc sự kiện phải diễn ra **sau** hạn chót donate!',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // 5. Check target channel and bot permissions
    const targetChannelId = env.eventChannelId || process.env.EVENT_CHANNEL_ID;
    if (!targetChannelId) {
      return await interaction.editReply({
        content: '❌ Lỗi: `EVENT_CHANNEL_ID` chưa được cấu hình trong file .env!',
      });
    }

    const channel =
      interaction.guild.channels.cache.get(targetChannelId) ||
      (await interaction.guild.channels.fetch(targetChannelId).catch(() => null));

    if (!channel) {
      return await interaction.editReply({
        content: `❌ Không tìm thấy kênh sự kiện với ID: \`${targetChannelId}\`!`,
      });
    }

    const me = interaction.guild.members.me || (await interaction.guild.members.fetchMe().catch(() => null));
    const permissions = channel.permissionsFor(me);
    const missingPerms = [];
    if (!permissions?.has(PermissionsBitField.Flags.ViewChannel)) missingPerms.push('`Xem Kênh (View Channel)`');
    if (!permissions?.has(PermissionsBitField.Flags.SendMessages)) missingPerms.push('`Gửi Tin Nhắn (Send Messages)`');
    if (!permissions?.has(PermissionsBitField.Flags.EmbedLinks)) missingPerms.push('`Chèn Liên Kết (Embed Links)`');

    if (missingPerms.length > 0) {
      return await interaction.editReply({
        content: `❌ Bot thiếu quyền trong kênh <#${targetChannelId}>!\nVui lòng cấp các quyền sau cho Role của Bot trong kênh đó:\n${missingPerms.join('\n')}`,
      });
    }

    // 6. Create event in Database
    const targetRoleId = env.eventRoleId || process.env.EVENT_ROLE_ID;
    const event = eventService.createEvent({
      title,
      rules,
      price,
      donateDeadline: parsedDonate.isoString,
      roleDeadline: parsedRole.isoString,
      channelId: targetChannelId,
      roleId: targetRoleId,
    });

    // 7. Post public message to EVENT_CHANNEL_ID
    const publicMsgData = createEventPublicMessage(event);
    const sentMsg = await channel.send(publicMsgData);

    // 8. Update message ID in DB
    eventService.updateEventMessageId(event.id, sentMsg.id);

    await interaction.editReply({
      content: `✅ Đã tạo sự kiện **#${event.id}: ${title}** thành công và đăng bài vào kênh <#${targetChannelId}>!`,
    });
  } catch (error) {
    await handleError(interaction, error, 'Lỗi khi xử lý tạo sự kiện');
  }
}


/**
 * Handle Button Click: btn_event_join_<event_id>
 */
async function handleEventJoinButton(interaction, eventId) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const event = eventService.getEventById(eventId);
    if (!event || event.status === 'ENDED') {
      return await interaction.editReply({
        content: '❌ Sự kiện này không tồn tại hoặc đã kết thúc!',
      });
    }

    // Check donation deadline
    const now = new Date();
    const deadline = new Date(event.donate_deadline);
    if (now >= deadline || event.status === 'CLOSED_REGISTRATION') {
      return await interaction.editReply({
        content: '❌ Sự kiện đã đóng cổng đăng ký!',
      });
    }

    // Check if member already has event role
    const roleId = event.role_id || env.eventRoleId;
    if (roleId && interaction.member?.roles?.cache?.has(roleId)) {
      return await interaction.editReply({
        content: `🎉 Bạn đã sở hữu Role sự kiện <@&${roleId}> rồi! Không cần đăng ký lại.`,
      });
    }

    // Fetch QR template from DB (if any)
    const qrTemplate = eventService.getQrTemplate();

    console.log('[QR Generator] Rendering new dynamic QR for user:', interaction.user.id);

    // Generate Sharp composited QR code dynamically
    const transferContent = `VAX ${interaction.user.id}`;
    const imageBuffer = await generateEventQrImage({
      bankAccount: env.sepay.bankAccount,
      bankCode: env.sepay.bankCode,
      amount: event.price,
      content: transferContent,
      templatePath: qrTemplate?.image_path,
    });

    const attachmentName = `event_qr_${interaction.user.id}.png`;
    const attachment = new AttachmentBuilder(imageBuffer, { name: attachmentName });
    const paymentEmbed = createPaymentEmbed(event, interaction.user, attachmentName);

    await interaction.editReply({
      embeds: [paymentEmbed],
      files: [attachment],
    });
  } catch (error) {
    await handleError(interaction, error, 'Không thể tạo mã QR thanh toán');
  }
}

module.exports = {
  handleEventQrCommand,
  handleEventOpenCommand,
  handleEventPreviewCommand,
  handleEventModalSubmit,
  handleEventJoinButton,
};
