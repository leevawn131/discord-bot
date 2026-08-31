const { routeOnboarding } = require('../modules/onboarding/onboarding.routes');
const { routeEvent } = require('../modules/event/event.routes');

module.exports = async (interaction) => {
  // 1. Pass interaction to onboarding router
  const handledOnboarding = await routeOnboarding(interaction);
  if (handledOnboarding) return;

  // 2. Pass interaction to event router
  const handledEvent = await routeEvent(interaction);
  if (handledEvent) return;
};

