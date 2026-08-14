const {
  handleStartOnboarding,
  handleRoleSelect,
} = require('./onboarding.handler');

async function routeOnboarding(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === 'role_select') {
    return handleRoleSelect(interaction);
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith('start_onboarding_')) {
      const targetUserId = interaction.customId.replace('start_onboarding_', '');
      return handleStartOnboarding(interaction, targetUserId);
    }
  }

  return false;
}

module.exports = { routeOnboarding };
