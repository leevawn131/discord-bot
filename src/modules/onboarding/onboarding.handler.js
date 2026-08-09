const roleService = require('../../services/role.service');
const { createNSFWConfirmationRow } = require('./onboarding.ui');
const { handleError } = require('../../utils/errorHandler');

async function handleRoleSelect(interaction) {
  try {
    const member = interaction.member;
    const selectedValues = interaction.values;

    await roleService.updateOnboardingRoles(member, selectedValues);

    await interaction.reply({
      content: '✅ Đã cập nhật role của bạn',
      ephemeral: true,
    });
  } catch (error) {
    await handleError(interaction, error, 'Không thể cập nhật role');
  }
}

async function handleNSFWCheck(interaction) {
  try {
    const row = createNSFWConfirmationRow();
    await interaction.reply({
      content: '⚠️ Bạn có chắc bạn đủ 18 tuổi không?',
      components: [row],
      ephemeral: true,
    });
  } catch (error) {
    await handleError(interaction, error, 'Không thể gửi câu hỏi xác nhận 18+');
  }
}

async function handleNSFWConfirmYes(interaction) {
  try {
    const member = interaction.member;
    await roleService.addNSFWRole(member);

    await interaction.update({
      content: '🔞 Đã cấp quyền NSFW',
      components: [],
    });
  } catch (error) {
    await handleError(interaction, error, 'Không thể cấp quyền NSFW');
  }
}

async function handleNSFWConfirmNo(interaction) {
  try {
    await interaction.update({
      content: '❌ Bạn chưa đủ tuổi',
      components: [],
    });
  } catch (error) {
    await handleError(interaction, error, 'Lỗi phản hồi nút từ chối');
  }
}

module.exports = {
  handleRoleSelect,
  handleNSFWCheck,
  handleNSFWConfirmYes,
  handleNSFWConfirmNo,
};
