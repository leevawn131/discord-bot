const {
  handleRoleSelect,
  handleNSFWCheck,
  handleNSFWConfirmYes,
  handleNSFWConfirmNo,
} = require('./onboarding.handler');

async function routeOnboarding(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === 'role_select') {
    return handleRoleSelect(interaction);
  }

  if (interaction.isButton()) {
    switch (interaction.customId) {
      case 'nsfw_check':
        return handleNSFWCheck(interaction);
      case 'nsfw_yes':
        return handleNSFWConfirmYes(interaction);
      case 'nsfw_no':
        return handleNSFWConfirmNo(interaction);
    }
  }

  return false;
}

module.exports = { routeOnboarding };
