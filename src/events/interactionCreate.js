const { routeOnboarding } = require('../modules/onboarding/onboarding.routes');

module.exports = async (interaction) => {
  // Pass interaction to onboarding router
  const handled = await routeOnboarding(interaction);
  if (!handled) {
    // Unhandled interactions can be routed to future modules here
  }
};
