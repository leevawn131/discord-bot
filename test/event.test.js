const assert = require('assert');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const dayjs = require('dayjs');

console.log('🚀 Starting Event Module Automated Tests...\n');

// 1. Test Date Parser
console.log('--- Test 1: Date Parser & Formatter ---');
const { parseVietnamDate, toDiscordTimestamp, formatVND, VN_TIMEZONE } = require('../src/modules/event/event.date');

// Future date calculation helper
const nextMonth = dayjs().tz(VN_TIMEZONE).add(1, 'month');
const futureDmy = nextMonth.format('DD/MM/YYYY');
const futureHhDmy = `18h30 ${futureDmy}`;
const futureColonDmy = `18:30 ${futureDmy}`;

// Test 1.1: DD/MM/YYYY
const res1 = parseVietnamDate(futureDmy);
assert.strictEqual(res1.valid, true, 'DD/MM/YYYY should be valid');
assert.strictEqual(res1.dayjs.hour(), 23, 'DD/MM/YYYY should default to 23:59:59');
assert.strictEqual(res1.dayjs.minute(), 59, 'DD/MM/YYYY should default to 23:59:59');
console.log(`✅ Format 1 [DD/MM/YYYY]: "${futureDmy}" -> ${res1.formatted} (Timestamp: ${res1.unixTimestamp})`);

// Test 1.2: HHhMM DD/MM/YYYY
const res2 = parseVietnamDate(futureHhDmy);
assert.strictEqual(res2.valid, true, 'HHhMM DD/MM/YYYY should be valid');
assert.strictEqual(res2.dayjs.hour(), 18);
assert.strictEqual(res2.dayjs.minute(), 30);
console.log(`✅ Format 2 [HHhMM DD/MM/YYYY]: "${futureHhDmy}" -> ${res2.formatted}`);

// Test 1.3: HH:mm DD/MM/YYYY
const res3 = parseVietnamDate(futureColonDmy);
assert.strictEqual(res3.valid, true, 'HH:mm DD/MM/YYYY should be valid');
assert.strictEqual(res3.dayjs.hour(), 18);
assert.strictEqual(res3.dayjs.minute(), 30);
console.log(`✅ Format 3 [HH:mm DD/MM/YYYY]: "${futureColonDmy}" -> ${res3.formatted}`);

// Test 1.4: Past date should fail
const pastDate = '01/01/2020';
const resPast = parseVietnamDate(pastDate);
assert.strictEqual(resPast.valid, false, 'Past date should be invalid');
console.log(`✅ Past date validation: "${pastDate}" correctly rejected -> ${resPast.error}`);

// Test 1.5: Currency and Discord timestamp formatting
const vndFormatted = formatVND(50000);
assert(vndFormatted.includes('50.000') || vndFormatted.includes('50,000'), 'VND formatting test');
const discordTag = toDiscordTimestamp(res1.unixTimestamp, 'F');
assert.strictEqual(discordTag, `<t:${res1.unixTimestamp}:F>`);
console.log(`✅ Formatting: 50000 -> ${vndFormatted}, Discord Tag -> ${discordTag}\n`);

// 2. Test SQLite Database & Event Service
console.log('--- Test 2: Database & Event Service CRUD ---');
const db = require('../src/database/db');
const eventService = require('../src/modules/event/event.service');

// Test 2.1: Create event
const newEvent = eventService.createEvent({
  title: 'Unit Test Event 2026',
  rules: 'Tham gia để nhận role đặc biệt',
  price: 50000,
  donateDeadline: res1.isoString,
  roleDeadline: nextMonth.add(2, 'day').toISOString(),
  channelId: '123456789012345678',
  roleId: '876543210987654321',
});

assert(newEvent && newEvent.id, 'Event should be created with ID');
assert.strictEqual(newEvent.title, 'Unit Test Event 2026');
assert.strictEqual(newEvent.status, 'ACTIVE');
console.log(`✅ Created Event #${newEvent.id} successfully: ${newEvent.title}`);

// Test 2.2: Fetch active event
const activeEvent = eventService.getActiveEvent();
assert(activeEvent, 'Should find active event');
console.log(`✅ Fetched Active Event #${activeEvent.id}`);

// Test 2.3: Template coordinates save and fetch (preserve existing if present)
const previousTemplate = eventService.getQrTemplate();
const testTemplatePath = path.join(__dirname, '../assets/templates/test_template.png');
eventService.saveQrTemplate(testTemplatePath, { x: 200, y: 350, width: 400, height: 400 });
const savedTemplate = eventService.getQrTemplate();
assert.strictEqual(savedTemplate.x, 200);
assert.strictEqual(savedTemplate.width, 400);
console.log(`✅ QR Template config saved and verified: (${savedTemplate.x}, ${savedTemplate.y}, ${savedTemplate.width}, ${savedTemplate.height})`);

// Restore previous template if existed
if (previousTemplate) {
  eventService.saveQrTemplate(previousTemplate.image_path, {
    x: previousTemplate.x,
    y: previousTemplate.y,
    width: previousTemplate.width,
    height: previousTemplate.height,
  });
}
console.log('');


// 3. Test Sharp QR Image Generation & Compositing
console.log('--- Test 3: Sharp Image Compositing & VietQR ---');
(async () => {
  const { generateEventQrImage, generateDefaultTemplate } = require('../src/modules/event/event.qr');

  // Test 3.1: Generate default template
  const defaultTplPath = path.join(__dirname, '../assets/templates/default_template.png');
  await generateDefaultTemplate(defaultTplPath);
  assert(fs.existsSync(defaultTplPath), 'Default template image must be created');
  const tplMeta = await sharp(defaultTplPath).metadata();
  assert.strictEqual(tplMeta.format, 'png');
  console.log(`✅ Default template image generated: ${tplMeta.width}x${tplMeta.height} px`);

  // Test 3.2: Generate composited QR image
  const compositedBuffer = await generateEventQrImage({
    bankAccount: '0123456789',
    bankCode: 'MBBank',
    amount: 50000,
    content: 'VAX 1535993017897320470',
    templatePath: defaultTplPath,
  });

  assert(Buffer.isBuffer(compositedBuffer), 'Output should be a Buffer');
  const finalMeta = await sharp(compositedBuffer).metadata();
  assert.strictEqual(finalMeta.format, 'png');
  console.log(`✅ Composited QR Image generated with sharp: ${finalMeta.width}x${finalMeta.height} px, Size: ${compositedBuffer.length} bytes\n`);

  // 4. Test Payment Fulfillment & Idempotency
  console.log('--- Test 4: Payment Fulfillment & Idempotency ---');
  let roleAdded = false;
  let dmSent = false;

  const mockClient = {
    guilds: {
      cache: {
        get: () => ({
          members: {
            fetch: async (id) => ({
              user: { username: 'TestUser', send: async () => { dmSent = true; } },
              roles: {
                add: async (roleId) => { roleAdded = true; },
                cache: { has: () => false },
              },
            }),
          },
        }),
      },
    },
  };

  const testTxId = `TX_TEST_${Date.now()}`;
  const paymentResult = await eventService.processPaymentSuccess({
    transactionId: testTxId,
    userId: '1535993017897320470',
    amount: 50000,
    transferContent: 'VAX 1535993017897320470',
    client: mockClient,
  });

  assert.strictEqual(paymentResult.success, true);
  assert.strictEqual(roleAdded, true, 'Role should be added to member');
  assert.strictEqual(dmSent, true, 'DM should be sent to user');
  console.log(`✅ First payment processed successfully (Role assigned & DM sent)`);

  // Test 4.2: Idempotency (Duplicate transaction check)
  const duplicateResult = await eventService.processPaymentSuccess({
    transactionId: testTxId,
    userId: '1535993017897320470',
    amount: 50000,
    transferContent: 'VAX 1535993017897320470',
    client: mockClient,
  });


  assert.strictEqual(duplicateResult.success, true);
  assert.strictEqual(duplicateResult.duplicate, true, 'Duplicate transaction must be skipped');
  console.log(`✅ Idempotency test passed: duplicate transaction was safely skipped\n`);

  // 5. Test Background Worker logic
  console.log('--- Test 5: Background Cron Worker Logic ---');
  let msgEdited = false;
  const mockMsgClient = {
    channels: {
      fetch: async () => ({
        messages: {
          fetch: async () => ({
            edit: async () => { msgEdited = true; },
          }),
        },
      }),
    },
    guilds: {
      cache: {
        get: () => ({
          members: {
            fetch: async () => ({
              roles: {
                cache: { has: () => true },
                remove: async () => {},
              },
            }),
          },
        }),
      },
    },
  };

  // Create an expired event to test close routine
  const expiredEvent = eventService.createEvent({
    title: 'Expired Event Test',
    rules: 'Test rules',
    price: 10000,
    donateDeadline: dayjs().subtract(5, 'minute').toISOString(),
    roleDeadline: dayjs().add(1, 'hour').toISOString(),
    channelId: '111222333',
    roleId: '444555666',
  });
  eventService.updateEventMessageId(expiredEvent.id, 'msg_999');

  const { createEventPublicMessage } = require('../src/modules/event/event.ui');
  await eventService.checkAndCloseDonations(mockMsgClient, createEventPublicMessage);

  const updatedExpired = eventService.getEventById(expiredEvent.id);
  assert.strictEqual(updatedExpired.status, 'CLOSED_REGISTRATION');
  assert.strictEqual(msgEdited, true, 'Public message embed should be edited to closed status');
  console.log(`✅ Background worker correctly transitioned Event #${expiredEvent.id} to CLOSED_REGISTRATION and updated Discord Embed!\n`);

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 💯');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
