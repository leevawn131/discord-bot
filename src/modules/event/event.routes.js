const {
  handleEventQrCommand,
  handleEventOpenCommand,
  handleEventPreviewCommand,
  handleEventModalSubmit,
  handleEventJoinButton,
} = require('./event.handler');

/**
 * Route event interactions (Slash Commands, Modals, Buttons)
 * Returns true if handled, false otherwise
 */
async function routeEvent(interaction) {
  // 1. Slash Commands
  if (interaction.isChatInputCommand() && interaction.commandName === 'event') {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'qr') {
      await handleEventQrCommand(interaction);
      return true;
    }
    if (subcommand === 'open') {
      await handleEventOpenCommand(interaction);
      return true;
    }
    if (subcommand === 'preview') {
      await handleEventPreviewCommand(interaction);
      return true;
    }
  }


  // 2. Modal Submits
  if (interaction.isModalSubmit() && interaction.customId === 'modal_event_create') {
    await handleEventModalSubmit(interaction);
    return true;
  }

  // 3. Button Clicks
  if (interaction.isButton() && interaction.customId.startsWith('btn_event_join_')) {
    const eventId = parseInt(interaction.customId.replace('btn_event_join_', ''), 10);
    await handleEventJoinButton(interaction, eventId);
    return true;
  }

  return false;
}

module.exports = { routeEvent };
