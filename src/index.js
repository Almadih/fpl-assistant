require('dotenv').config();
const client = require('./bot');

console.log('🤖 FPL Assistant WhatsApp Bot Starting...');

// Start WhatsApp Client Connection
client.initialize()
  .then(() => {
    console.log('[App] Client initialization sequence started...');
  })
  .catch((err) => {
    console.error('[App] Failed to initialize WhatsApp client:', err.stack || err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[App] Shutting down gracefully...');
  try {
    await client.destroy();
    console.log('[App] WhatsApp Client destroyed.');
  } catch (err) {
    console.error('[App] Error destroying client:', err.message);
  }
  process.exit(0);
});
