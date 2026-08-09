const env = require('../config/env');
const { createOnboardingEmbed, createOnboardingComponents } = require('../modules/onboarding/onboarding.ui');
const logger = require('../utils/logger');

module.exports = async (client, channelIdOverride) => {
  const targetChannelId = channelIdOverride || env.channelOnboarding;
  if (!targetChannelId) {
    logger.error('CHANNEL_ONBOARDING environment variable is not configured');
    console.error('❌ Lỗi: CHANNEL_ONBOARDING chưa được thiết lập trong .env');
    return;
  }

  const channel = client.channels.cache.get(targetChannelId);
  if (!channel) {
    logger.error(`Channel with ID ${targetChannelId} not found in client cache`);
    console.error(`❌ Không tìm thấy kênh với ID: ${targetChannelId}`);
    return;
  }

  const embed = createOnboardingEmbed();
  const components = createOnboardingComponents();

  await channel.send({
    embeds: [embed],
    components: components,
  });

  console.log(`✅ Đã gửi panel onboarding vào channel: ${channel.name}`);
};
