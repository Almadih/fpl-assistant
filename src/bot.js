const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const commandRouter = require('./commands');
const schedulerService = require('./services/schedulerService');

console.log('[Bot] Initializing WhatsApp Client...');
console.log(`[Bot] Using Chrome binary at: ${config.chromePath}`);
console.log(`[Bot] Session auth data path: ${config.authPath}`);

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: config.authPath
  }),
  puppeteer: {
    executablePath: config.chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
    // Run headless because it will execute in background
    headless: true
  }
});

client.on('qr', (qr) => {
  console.log('\n[Bot] ====== QR CODE ======');
  console.log('[Bot] Scan the QR code below using WhatsApp on your phone:');
  qrcode.generate(qr, { small: true });
  console.log('[Bot] =====================\n');
});

client.on('ready', () => {
  console.log('[Bot] WhatsApp Client is READY and connected!');
  console.log(`[Bot] Connected as: ${client.info.pushname} (${client.info.wid.user})`);
  
  // Start the scheduler once the bot is ready
  schedulerService.initScheduler(client);
});

client.on('message', async (message) => {
  try {
    await commandRouter.handleMessage(client, message);
  } catch (err) {
    console.error('[Bot] Error handling message:', err.message);
  }
});

client.on('auth_failure', (msg) => {
  console.error('[Bot] WhatsApp Authentication failure:', msg);
});

client.on('disconnected', (reason) => {
  console.log('[Bot] WhatsApp Client was disconnected:', reason);
});

module.exports = client;
