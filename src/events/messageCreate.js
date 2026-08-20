const moderationService = require('../services/moderation.service');
const logger = require('../utils/logger');

module.exports = async (message) => {
  try {
    // Ignore messages sent by bots or outside guilds
    if (message.author.bot || !message.guild) {
      return;
    }

    // 1. Check if message is in a restricted channel (cấm chat) -> Delete & Kick
    const kicked = await moderationService.checkAndKickRestrictedChannel(message);
    if (kicked) {
      return;
    }

    // 2. Check message content for banned words (".steam", etc.) and delete + kick if matched
    await moderationService.checkAndKickForSteamMessage(message);
  } catch (error) {
    logger.error('Error handling messageCreate event:', error);
  }
};
