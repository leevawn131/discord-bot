const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  token: process.env.TOKEN || '',
  guildId: process.env.GUILD_ID || '',
  clientId: process.env.CLIENT_ID || '',
  channelOnboarding: process.env.CHANNEL_ONBOARDING || '',
  eventChannelId: process.env.EVENT_CHANNEL_ID || '',
  eventRoleId: process.env.EVENT_ROLE_ID || '',
  webhookPort: parseInt(process.env.PORT || '3000', 10),
  sepay: {
    apiKey: process.env.SEPAY_API_KEY || '',
    bankAccount: process.env.SEPAY_BANK_ACCOUNT || '',
    bankCode: process.env.SEPAY_BANK_CODE || '',
    accountName: process.env.SEPAY_ACCOUNT_NAME || '',
  },


  roles: {
    artistId: process.env.ROLE_ARTIST_ID || '',
    musicId: process.env.ROLE_MUSIC_ID || '',
    miniSocId: process.env.ROLE_MINI_SOC || '',
    batTaiId: process.env.ROLE_BAT_TAI || '',
    nsfwId: process.env.ROLE_NSFW_ID || '',
  },
};

