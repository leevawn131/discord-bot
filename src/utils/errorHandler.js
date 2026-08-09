const logger = require('./logger');

async function handleError(interaction, error, contextMessage = 'Đã xảy ra lỗi hệ thống') {
  logger.error(contextMessage, error);

  const replyOptions = {
    content: `❌ ${contextMessage}`,
    ephemeral: true,
  };

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  } catch (err) {
    logger.error('Failed to send error reply to user', err);
  }
}

module.exports = { handleError };
