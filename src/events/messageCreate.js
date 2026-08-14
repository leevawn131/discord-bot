const moderationService = require('../services/moderation.service');
const logger = require('../utils/logger');

module.exports = async (message) => {
  try {
    // Ignore messages sent by bots or outside guilds
    if (message.author.bot || !message.guild) {
      return;
    }

    // Check message content for ".steam" and delete + kick if matched
    await moderationService.checkAndKickForSteamMessage(message);
  } catch (error) {
    logger.error('Error handling messageCreate event:', error);
  }
};
