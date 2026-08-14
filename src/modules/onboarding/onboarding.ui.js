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

function createOnboardingEmbed(status = {}, isConflict = false) {
  const { hasArtist, hasMusic, hasBatTai } = status;

  if (isConflict) {
    return new EmbedBuilder()
      .setTitle('🎭 Vaxloz Onboarding')
      .setDescription('❌ **Trạng thái:** Lựa chọn bị lỗi xung đột! Đã hủy hết role. Vui lòng chọn lại từ đầu.')
      .setColor('Red');
  }

  let statusText = 'Chưa chọn role nào.';
  if (hasBatTai) {
    statusText = '✅ Đã chọn: **🛋️ Sóc ăn nằm**';
  } else if (hasArtist && hasMusic) {
    statusText = '✅ Đã chọn: **🎨 Biết vẽ** & **🎵 Làm nhạc**';
  } else if (hasArtist) {
    statusText = '✅ Đã chọn: **🎨 Biết vẽ**';
  } else if (hasMusic) {
    statusText = '✅ Đã chọn: **🎵 Làm nhạc**';
  }

  return new EmbedBuilder()
    .setTitle('🎭 Vaxloz Onboarding')
    .setDescription(`Vui lòng tích chọn vai trò của bạn bên dưới:\n\nTrạng thái hiện tại: ${statusText}`)
    .setColor('Purple');
}

/**
 * Create dynamic StringSelectMenu Checkbox list with maxValues = 2 (Enables native Checkboxes UI)
 * - If 'hasBatTai' is active -> Hide 'artist' & 'music' options.
 * - If 'hasArtist' or 'hasMusic' is active -> Hide 'bat_tai' option.
 * - If conflict or initial -> Show all 3 options with Checkboxes.
 */
function createRoleSelectMenu(status = {}, isConflict = false) {
  const { hasArtist, hasMusic, hasBatTai } = status;

  const options = [];

  if (!isConflict && hasBatTai) {
    options.push({
      label: '🛋️ Sóc ăn nằm',
      value: 'bat_tai',
      description: 'Dành cho ai không làm nhạc & không biết vẽ',
      default: true,
    });
  } else if (!isConflict && (hasArtist || hasMusic)) {
    options.push({
      label: '🎨 Biết vẽ',
      value: 'artist',
      description: 'Kỹ năng vẽ',
      default: Boolean(hasArtist),
    });
    options.push({
      label: '🎵 Làm nhạc',
      value: 'music',
      description: 'Kỹ năng làm nhạc',
      default: Boolean(hasMusic),
    });
  } else {
    // Show all 3 options when no roles held or after conflict
    options.push(
      {
        label: '🎨 Biết vẽ',
        value: 'artist',
        description: 'Kỹ năng vẽ',
      },
      {
        label: '🎵 Làm nhạc',
        value: 'music',
        description: 'Kỹ năng làm nhạc',
      },
      {
        label: '🛋️ Sóc ăn nằm',
        value: 'bat_tai',
        description: 'Dành cho ai không làm nhạc & không biết vẽ',
      },
    );
  }

  if (!isConflict && (hasArtist || hasMusic || hasBatTai)) {
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
    .setMaxValues(2)
    .addOptions(options);
}

function createOnboardingComponents(status = {}, isConflict = false) {
  const row1 = new ActionRowBuilder().addComponents(createRoleSelectMenu(status, isConflict));
  return [row1];
}

module.exports = {
  createStartOnboardingButton,
  createOnboardingEmbed,
  createOnboardingComponents,
};
