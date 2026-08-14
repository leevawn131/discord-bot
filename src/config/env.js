const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  token: process.env.TOKEN || '',
  guildId: process.env.GUILD_ID || '',
  channelOnboarding: process.env.CHANNEL_ONBOARDING || '',
  roles: {
    artistId: process.env.ROLE_ARTIST_ID || '',
    musicId: process.env.ROLE_MUSIC_ID || '',
    miniSocId: process.env.ROLE_MINI_SOC || '',
    batTaiId: process.env.ROLE_BAT_TAI || '',
    nsfwId: process.env.ROLE_NSFW_ID || '',
  },
};
