const env = require('./env');

// Role ID mapping (Rule 1 in AGENT.md)
// Falls back to role names for legacy support if ENV role IDs are missing
module.exports = {
  roleMap: {
    artist: { id: env.roles.artistId, name: 'sóc biết vẽ' },
    music: { id: env.roles.musicId, name: 'sóc làm nhạc' },
  },
  nsfwRole: { id: env.roles.nsfwId, name: 'sóc nsfw' },
};
