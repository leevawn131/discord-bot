const env = require('../config/env');
const logger = require('../utils/logger');
const { createStartOnboardingButton } = require('../modules/onboarding/onboarding.ui');
const moderationService = require('../services/moderation.service');

module.exports = async (member) => {
  try {
    logger.info(`New member joined: ${member.user.tag} (${member.id})`);

    // Check and auto-kick if username/display name contains ".steam"
    const kicked = await moderationService.checkAndKickSteamAccount(member);
    if (kicked) {
      return; // Stop onboarding if member was kicked
    }

    const channelId = env.channelOnboarding;
    if (!channelId) {
      logger.error('CHANNEL_ONBOARDING is not configured in .env');
      return;
    }

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) {
      logger.error(`Onboarding channel with ID ${channelId} not found`);
      return;
    }

    // Create start onboarding button bound specifically to member.id
    const startRow = createStartOnboardingButton(member.id);

    // Send public welcome message with user-locked button
    await channel.send({
      content: `👋 Chào mừng <@${member.id}> đến với **${member.guild.name}**! Vui lòng bấm vào nút bên dưới để chọn role và mở khóa các kênh nhé!`,
      components: [startRow],
    });
  } catch (error) {
    logger.error('Error handling guildMemberAdd event:', error);
  }
};
