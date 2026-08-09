const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

function createOnboardingEmbed() {
  return new EmbedBuilder()
    .setTitle('🎭 Vaxloz Onboarding')
    .setDescription('Chọn vai trò của bạn bên dưới')
    .setColor('Purple');
}

function createRoleSelectMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId('role_select')
    .setPlaceholder('Chọn kỹ năng của bạn')
    .setMinValues(1)
    .setMaxValues(2)
    .addOptions([
      {
        label: '🎨 Biết vẽ',
        value: 'artist',
      },
      {
        label: '🎵 Làm nhạc',
        value: 'music',
      },
    ]);
}

function createNSFWButton() {
  return new ButtonBuilder()
    .setCustomId('nsfw_check')
    .setLabel('🔞 Xác nhận 18+')
    .setStyle(ButtonStyle.Danger);
}

function createNSFWConfirmationRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('nsfw_yes')
      .setLabel('Tôi đủ 18+')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('nsfw_no')
      .setLabel('Chưa đủ')
      .setStyle(ButtonStyle.Secondary),
  );
}

function createOnboardingComponents() {
  const row1 = new ActionRowBuilder().addComponents(createRoleSelectMenu());
  const row2 = new ActionRowBuilder().addComponents(createNSFWButton());
  return [row1, row2];
}

module.exports = {
  createOnboardingEmbed,
  createOnboardingComponents,
  createNSFWConfirmationRow,
};
