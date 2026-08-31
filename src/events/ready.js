const logger = require('../utils/logger');
const { registerEventCommands } = require('../modules/event/event.command');
const { startEventWorker } = require('../modules/event/event.worker');
const { startWebhookServer } = require('../server/webhook');

module.exports = async (client) => {
  const msg = `🔥 Vaxloz online: ${client.user.tag}`;
  logger.info(msg);

  // 1. Register Slash Commands
  await registerEventCommands(client);

  // 2. Start Background Cron Worker for monitoring event deadlines
  startEventWorker(client);

  // 3. Start SePay Webhook Server
  startWebhookServer(client);
};

