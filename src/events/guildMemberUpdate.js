const moderationService = require('../services/moderation.service');
const logger = require('../utils/logger');

module.exports = async (oldMember, newMember) => {
  try {
    await moderationService.checkAndKickSteamAccount(newMember);
  } catch (error) {
    logger.error('Error handling guildMemberUpdate moderation event:', error);
  }
};
