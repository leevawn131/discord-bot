require('dotenv').config();

module.exports = {
  token: process.env.TOKEN || '',
  guildId: process.env.GUILD_ID || '',
  channelOnboarding: process.env.CHANNEL_ONBOARDING || '',
  roles: {
    artistId: process.env.ROLE_ARTIST_ID || '',
    musicId: process.env.ROLE_MUSIC_ID || '',
    nsfwId: process.env.ROLE_NSFW_ID || '',
  },
};
