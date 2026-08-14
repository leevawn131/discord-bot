const env = require('./config/env');
const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('./utils/logger');

if (!env.token) {
  logger.error('Discord bot TOKEN is missing in .env file');
  console.error('❌ Lỗi: Chưa cấu hình TOKEN trong file .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load events
client.on('interactionCreate', require('./events/interactionCreate'));
client.on('guildMemberAdd', require('./events/guildMemberAdd'));
client.on('guildMemberUpdate', require('./events/guildMemberUpdate'));
client.on('messageCreate', require('./events/messageCreate'));
client.once('clientReady', () => require('./events/ready')(client));

// Login bot
client.login(env.token).catch((err) => {
  logger.error('Failed to log in to Discord', err);
  console.error('❌ Lỗi đăng nhập Discord:', err.message);
});
