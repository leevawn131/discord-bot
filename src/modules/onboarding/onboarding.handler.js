const env = require('../../config/env');
const roleService = require('../../services/role.service');
const { createOnboardingEmbed, createOnboardingComponents } = require('./onboarding.ui');
const { handleError } = require('../../utils/errorHandler');

/**
 * Get GuildMember object whether interaction happens in Server or DM
 */
async function getMember(interaction) {
  if (interaction.guild && interaction.member) {
    return interaction.member;
  }

  const guildId = env.guildId;
  if (!guildId) {
    throw new Error('GUILD_ID chưa được cấu hình trong .env');
  }

  const guild = interaction.client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error(`Bot chưa gia nhập hoặc không tìm thấy máy chủ với ID: ${guildId}`);
  }

  return await guild.members.fetch(interaction.user.id);
}

async function handleStartOnboarding(interaction, targetUserId) {
  try {
    // Prevent others from clicking someone else's onboarding button
    if (interaction.user.id !== targetUserId) {
      return await interaction.reply({
        content: `❌ Nút này dành riêng cho thành viên mới <@${targetUserId}>!`,
        ephemeral: true,
      });
    }

    const member = await getMember(interaction);
    const status = roleService.getMemberRoleStatus(member);
    const embed = createOnboardingEmbed(status);
    const components = createOnboardingComponents(status);

    await interaction.reply({
      content: '🎭 **Bảng chọn Role cá nhân của bạn:**',
      embeds: [embed],
      components: components,
      ephemeral: true,
    });
  } catch (error) {
    await handleError(interaction, error, 'Không thể mở bảng chọn role');
  }
}

async function handleRoleSelect(interaction) {
  try {
    await interaction.deferUpdate();

    const member = await getMember(interaction);
    const selectedValues = interaction.values;

    await roleService.updateOnboardingRoles(member, selectedValues);

    // Refresh member status & render components accordingly
    const status = roleService.getMemberRoleStatus(member);
    const embed = createOnboardingEmbed(status);
    const components = createOnboardingComponents(status);

    await interaction.editReply({
      content: '🎭 **Bảng chọn Role cá nhân của bạn:**',
      embeds: [embed],
      components: components,
    });
  } catch (error) {
    await handleError(interaction, error, 'Không thể cập nhật role');
  }
}

module.exports = {
  handleStartOnboarding,
  handleRoleSelect,
};
