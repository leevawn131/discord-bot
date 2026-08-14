const env = require('./env');

module.exports = {
  roleMap: {
    artist: { id: env.roles.artistId, name: 'sóc biết vẽ' },
    music: { id: env.roles.musicId, name: 'sóc làm nhạc' },
    batTai: { id: env.roles.batTaiId, name: 'sóc ăn nằm' },
  },
  miniSocRole: { id: env.roles.miniSocId, name: 'sóc nhỏ' },
  nsfwRole: { id: env.roles.nsfwId, name: 'sóc nsfw' },
};
