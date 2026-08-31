const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
} = require('discord.js');
const env = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * Define /event Slash Command with subcommands 'qr' and 'open'
 */
const eventSlashCommand = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Quản lý sự kiện và tích hợp thanh toán tự động')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('qr')
      .setDescription('Lưu ảnh template sự kiện và toạ độ khung dán QR')
      .addAttachmentOption((option) =>
        option
          .setName('template_image')
          .setDescription('File ảnh template (chứa khung trắng để dán mã QR)')
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName('qr_x')
          .setDescription('Toạ độ X (trục ngang) của góc trên-trái khung QR (mặc định: 225)')
          .setRequired(false)
      )
      .addIntegerOption((option) =>
        option
          .setName('qr_y')
          .setDescription('Toạ độ Y (trục dọc) của góc trên-trái khung QR (mặc định: 400)')
          .setRequired(false)
      )
      .addIntegerOption((option) =>
        option
          .setName('qr_width')
          .setDescription('Chiều rộng của mã QR (mặc định: 450)')
          .setRequired(false)
      )
      .addIntegerOption((option) =>
        option
          .setName('qr_height')
          .setDescription('Chiều cao của mã QR (mặc định: 450)')
          .setRequired(false)
      )
      .addNumberOption((option) =>
        option
          .setName('qr_angle')
          .setDescription('Góc nghiêng xoay mã QR theo độ (VD: -5.8 hoặc 0)')
          .setRequired(false)
      )
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName('open')
      .setDescription('Mở form tạo sự kiện mới và đăng bài vào kênh sự kiện')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('preview')
      .setDescription('Xem trước ảnh QR được ghép vào template (Chỉ bạn nhìn thấy)')
      .addIntegerOption((option) =>
        option
          .setName('amount')
          .setDescription('Số tiền donate test (Mặc định: 50000)')
          .setRequired(false)
      )
  );


/**
 * Register slash commands with Discord API for immediate availability
 */
async function registerEventCommands(client) {
  const token = env.token;
  const guildId = env.guildId;
  const clientId = client?.user?.id || env.clientId;

  if (!token || !clientId) {
    logger.warn('Skipping slash command registration: Missing TOKEN or CLIENT_ID');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    logger.info('Registering slash commands with Discord API...');
    const commandsData = [eventSlashCommand.toJSON()];

    if (guildId) {
      // Guild-specific registration (updates immediately)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandsData,
      });
      logger.info(`Successfully registered /event slash command for Guild: ${guildId}`);
    } else {
      // Global registration
      await rest.put(Routes.applicationCommands(clientId), {
        body: commandsData,
      });
      logger.info('Successfully registered /event slash command globally');
    }
  } catch (err) {
    logger.error('Failed to register slash commands', err);
  }
}

module.exports = {
  eventSlashCommand,
  registerEventCommands,
};
