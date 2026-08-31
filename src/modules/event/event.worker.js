const cron = require('node-cron');
const eventService = require('./event.service');
const { createEventPublicMessage } = require('./event.ui');
const logger = require('../../utils/logger');

let cronJob = null;

/**
 * Starts the background cron worker to monitor deadlines every minute
 */
function startEventWorker(client) {
  if (cronJob) {
    cronJob.stop();
  }

  // Run every minute
  cronJob = cron.schedule('* * * * *', async () => {
    try {
      // 1. Check expired donations -> close registration & update embed
      await eventService.checkAndCloseDonations(client, createEventPublicMessage);

      // 2. Check ended events -> revoke roles & finalize status
      await eventService.checkAndEndEvents(client, createEventPublicMessage);
    } catch (err) {
      logger.error('Error during event cron worker execution', err);
    }
  });

  logger.info('⏰ Event background worker (node-cron) scheduled to run every minute.');
}

/**
 * Stop cron worker if needed
 */
function stopEventWorker() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Event background worker stopped.');
  }
}

module.exports = {
  startEventWorker,
  stopEventWorker,
};
