const express = require('express');
const env = require('../config/env');
const logger = require('../utils/logger');
const eventService = require('../modules/event/event.service');

/**
 * Creates and starts the Express webhook server for SePay.vn
 * @param {import('discord.js').Client} client
 */
function startWebhookServer(client) {
  const app = express();
  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get(['/health', '/api/health'], (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // SePay Webhook Handler (Supports standard Bank Accounts & Virtual Accounts)
  const handleSepayWebhook = async (req, res) => {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization || '';
      const body = req.body || {};

      logger.info(`[Webhook Incoming] ${req.method} ${req.originalUrl} from ${req.ip} | Auth: "${authHeader}"`);
      logger.info(`[Webhook Incoming] Payload Body: ${JSON.stringify(body)}`);

      const transactionId = body.id || body.transaction_id || body.transactionId || Date.now();
      const content = body.content || '';
      const description = body.description || '';
      const code = body.code || '';
      const subAccount = body.subAccount || body.sub_account || '';
      const referenceCode = body.referenceCode || body.reference_code || '';
      const transferAmount = body.transferAmount || body.transfer_amount || body.amountIn || body.amount_in || body.amount || 0;

      const fullContent = `${content} ${description} ${code} ${subAccount} ${referenceCode}`.trim();
      const amount = Number(transferAmount);

      logger.info(`Received SePay Webhook: Tx #${transactionId}, Amount: ${amount} VND, FullContent: "${fullContent}"`);

      // 2. Parse Discord User ID from transfer content (syntax: VAX <DISCORD_USER_ID> or raw 17-20 digit ID)
      let discordUserId = null;
      const vaxMatch = fullContent.match(/VAX\s*(\d{17,20})/i);
      if (vaxMatch) {
        discordUserId = vaxMatch[1];
      } else {
        const rawIdMatch = fullContent.match(/\b(1\d{16,19})\b/);
        if (rawIdMatch) {
          discordUserId = rawIdMatch[1];
        }
      }

      if (!discordUserId) {
        logger.warn(`No valid Discord User ID found in transfer content: "${fullContent}"`);
        return res.status(200).json({
          success: true,
          message: 'Ignored: No matching VAX user id format found in transfer content',
        });
      }

      // 3. Process payment fulfillment
      const result = await eventService.processPaymentSuccess({
        transactionId,
        userId: discordUserId,
        amount,
        transferContent: fullContent,
        client,
      });

      if (!result.success) {
        logger.warn(`Payment processing warning for user ${discordUserId}: ${result.error}`);
        return res.status(200).json({
          success: false,
          message: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Payment processed and role assigned successfully',
      });
    } catch (err) {
      logger.error('Error handling SePay webhook', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // Support both endpoint paths (/api/webhook/sepay and /webhook/sepay)
  app.post('/api/webhook/sepay', handleSepayWebhook);
  app.post('/webhook/sepay', handleSepayWebhook);

  const port = env.webhookPort || 3000;
  const server = app.listen(port, () => {
    logger.info(`🌐 SePay Webhook Server is running on port ${port} (Endpoints: POST /webhook/sepay & POST /api/webhook/sepay)`);
  });

  return server;
}

module.exports = { startWebhookServer };
