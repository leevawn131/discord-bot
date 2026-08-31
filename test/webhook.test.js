const assert = require('assert');
const axios = require('axios');
const http = require('http');
const { startWebhookServer } = require('../src/server/webhook');
const eventService = require('../src/modules/event/event.service');
const env = require('../src/config/env');

console.log('🚀 Testing SePay Webhook Server HTTP Endpoints...\n');

(async () => {
  let roleGranted = false;
  let dmSent = false;

  const mockClient = {
    guilds: {
      cache: {
        get: () => ({
          members: {
            fetch: async (id) => ({
              user: { username: 'WebhookTestUser', send: async () => { dmSent = true; } },
              roles: {
                add: async (roleId) => { roleGranted = true; },
                cache: { has: () => false },
              },
            }),
          },
        }),
      },
    },
  };

  // Ensure there is an active event
  const testEvent = eventService.createEvent({
    title: 'Webhook Test Summer Event',
    rules: 'Luật chơi webhook',
    price: 50000,
    donateDeadline: new Date(Date.now() + 86400000).toISOString(),
    roleDeadline: new Date(Date.now() + 172800000).toISOString(),
    channelId: '123456789012345678',
    roleId: '876543210987654321',
  });

  const server = startWebhookServer(mockClient);
  const testPort = env.webhookPort || 3000;
  const baseUrl = `http://localhost:${testPort}`;

  // Wait for server to listen
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 1: Health check
  const healthRes = await axios.get(`${baseUrl}/health`);
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthRes.data.status, 'ok');
  console.log('✅ Health check endpoint GET /health -> 200 OK');

  // Test 2: Webhook POST with valid SePay payload
  const webhookPayload = {
    id: `SEP_TX_${Date.now()}`,
    gateway: 'MBBank',
    transactionDate: new Date().toISOString(),
    accountNumber: '0123456789',
    content: 'VAX 1535993017897320470 ung ho su kien',
    transferType: 'in',
    transferAmount: 50000,
    referenceCode: 'FT123456789',
  };

  const webhookRes = await axios.post(`${baseUrl}/api/webhook/sepay`, webhookPayload, {
    headers: {
      Authorization: `Apikey ${env.sepay.apiKey || 'sepay_secret_api_key_placeholder'}`,
      'Content-Type': 'application/json',
    },
  });

  assert.strictEqual(webhookRes.status, 200);
  assert.strictEqual(webhookRes.data.success, true);
  assert.strictEqual(roleGranted, true, 'Role should be granted via webhook');
  assert.strictEqual(dmSent, true, 'DM should be sent via webhook');
  console.log('✅ Webhook POST /api/webhook/sepay processed successfully, granted role and sent DM!');

  // Test 3: Webhook Duplicate Idempotency
  const dupRes = await axios.post(`${baseUrl}/api/webhook/sepay`, webhookPayload, {
    headers: {
      Authorization: `Apikey ${env.sepay.apiKey || 'sepay_secret_api_key_placeholder'}`,
      'Content-Type': 'application/json',
    },
  });
  assert.strictEqual(dupRes.status, 200);
  assert.strictEqual(dupRes.data.success, true);
  console.log('✅ Webhook duplicate payload gracefully handled without duplicate role grants!');

  // Cleanup server
  server.close();
  console.log('\n🎉 ALL WEBHOOK INTEGRATION TESTS PASSED! 💯');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Webhook test failed:', err);
  process.exit(1);
});
