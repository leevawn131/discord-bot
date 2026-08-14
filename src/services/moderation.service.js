const logger = require('../utils/logger');
const bannedWords = require('../config/bannedWords');

/**
 * Check if text contains any banned word or pattern from bannedWords list
 * Supports Vietnamese characters, case-insensitive string matching, and RegExp
 * @param {string} text
 * @returns {{ matched: boolean, matchedWord: string | null }}
 */
function findBannedWord(text) {
  if (!text) return { matched: false, matchedWord: null };

  const normalizedText = text.toLowerCase();

  for (const item of bannedWords) {
    if (item instanceof RegExp) {
      if (item.test(text)) {
        return { matched: true, matchedWord: item.toString() };
      }
    } else if (typeof item === 'string') {
      const wordLower = item.toLowerCase();
      if (normalizedText.includes(wordLower)) {
        return { matched: true, matchedWord: item };
      }
    }
  }

  return { matched: false, matchedWord: null };
}

/**
 * Check if a member's username, display name, or global name contains any banned word
 */
function isBannedAccount(member) {
  const username = member.user?.username || '';
  const globalName = member.user?.globalName || '';
  const displayName = member.displayName || '';

  const checkUsername = findBannedWord(username);
  if (checkUsername.matched) return checkUsername;

  const checkGlobal = findBannedWord(globalName);
  if (checkGlobal.matched) return checkGlobal;

  const checkDisplay = findBannedWord(displayName);
  if (checkDisplay.matched) return checkDisplay;

  return { matched: false, matchedWord: null };
}

/**
 * Check member name and kick if it contains any banned word
 */
async function checkAndKickSteamAccount(member) {
  const check = isBannedAccount(member);
  if (!check.matched) {
    return false;
  }

  const reason = `Tự động kick: Tên người dùng chứa từ cấm "${check.matchedWord}"`;
  logger.warn(`Detecting banned word "${check.matchedWord}" in username/display name for ${member.user.tag} (${member.id}). Attempting auto-kick...`);

  try {
    if (member.kickable) {
      await member.kick(reason);
      logger.info(`✅ Automatically kicked member ${member.user.tag} (${member.id}) for containing banned word "${check.matchedWord}" in name.`);
      return true;
    } else {
      logger.warn(`Cannot kick ${member.user.tag}: Bot permissions/hierarchy insufficient.`);
    }
  } catch (error) {
    logger.error(`❌ Failed to auto-kick member ${member.user.tag} (${member.id}):`, error.message);
  }
  return false;
}

/**
 * Check message content, delete message and kick sender if content contains any banned word
 */
async function checkAndKickForSteamMessage(message) {
  const check = findBannedWord(message.content);
  if (!check.matched) {
    return false;
  }

  logger.warn(`Banned word "${check.matchedWord}" detected in message from ${message.author.tag} (${message.author.id}) in #${message.channel.name}.`);

  // 1. Delete message
  try {
    if (message.deletable) {
      await message.delete();
      logger.info(`Deleted message containing banned word "${check.matchedWord}" from ${message.author.tag}`);
    }
  } catch (err) {
    logger.error(`Failed to delete message from ${message.author.tag}:`, err.message);
  }

  // 2. Kick sender
  try {
    const member = message.member || await message.guild.members.fetch(message.author.id);
    if (member && member.kickable) {
      await member.kick(`Tự động kick: Gửi tin nhắn chứa từ cấm "${check.matchedWord}"`);
      logger.info(`✅ Successfully kicked ${message.author.tag} for sending banned word "${check.matchedWord}".`);
      return true;
    } else {
      logger.warn(`Cannot kick ${message.author.tag}: Member is not kickable by bot.`);
    }
  } catch (err) {
    logger.error(`Failed to kick ${message.author.tag}:`, err.message);
  }

  return false;
}

module.exports = {
  findBannedWord,
  isBannedAccount,
  checkAndKickSteamAccount,
  checkAndKickForSteamMessage,
};
