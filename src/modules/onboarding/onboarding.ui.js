const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

function createStartOnboardingButton(targetUserId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`start_onboarding_${targetUserId}`)
      .setLabel('🎭 Bấm vào đây để chọn Role')
      .setStyle(ButtonStyle.Primary),
  );
}

function createOnboardingEmbed(status = {}) {
  const { hasArtist, hasMusic, hasBatTai } = status;

  const selectedList = [];
  if (hasArtist) selectedList.push('🎨 **Biết vẽ**');
  if (hasMusic) selectedList.push('🎵 **Làm nhạc**');
  if (hasBatTai) selectedList.push('🛋️ **Sóc ăn nằm**');

  const statusText = selectedList.length > 0
    ? `✅ Đã chọn: ${selectedList.join(', ')}`
    : 'Chưa chọn role nào.';

  return new EmbedBuilder()
    .setTitle('🎭 Vaxloz Onboarding')
    .setDescription(`Vui lòng tích chọn vai trò của bạn bên dưới (có thể chọn 1, 2 hoặc cả 3 role):\n\nTrạng thái hiện tại: ${statusText}`)
    .setColor('Purple');
}

/**
 * Create StringSelectMenu Checkbox list allowing selection of 1, 2, or all 3 roles freely
 */
function createRoleSelectMenu(status = {}) {
  const { hasArtist, hasMusic, hasBatTai } = status;

  const options = [
    {
      label: '🎨 Biết vẽ',
      value: 'artist',
      description: 'Kỹ năng vẽ',
      default: Boolean(hasArtist),
    },
    {
      label: '🎵 Làm nhạc',
      value: 'music',
      description: 'Kỹ năng làm nhạc',
      default: Boolean(hasMusic),
    },
    {
      label: '🛋️ Sóc ăn nằm',
      value: 'bat_tai',
      description: 'Dành cho ai thích ăn nằm',
      default: Boolean(hasBatTai),
    },
  ];

  if (hasArtist || hasMusic || hasBatTai) {
    options.push({
      label: '🔄 Bỏ chọn tất cả / Đặt lại',
      value: 'reset',
      description: 'Hủy tất cả vai trò đã chọn',
    });
  }

  return new StringSelectMenuBuilder()
    .setCustomId('role_select')
    .setPlaceholder('Mở danh sách để tích chọn role...')
    .setMinValues(1)
    .setMaxValues(3)
    .addOptions(options);
}

function createOnboardingComponents(status = {}) {
  const row1 = new ActionRowBuilder().addComponents(createRoleSelectMenu(status));
  return [row1];
}

module.exports = {
  createStartOnboardingButton,
  createOnboardingEmbed,
  createOnboardingComponents,
};
