const config = require('../config');

module.exports = {
  name: 'help',
  description: 'Shows the list of available commands and usage.',
  async execute(client, message, args) {
    const prefix = config.prefix;
    const response = 
      `🤖 *FPL Assistant Bot Commands* 🤖\n\n` +
      `You can use the following commands:\n` +
      `• \`${prefix}deadline\` - Get next gameweek deadline and countdown.\n` +
      `• \`${prefix}fixtures\` - Get fixtures for the next gameweek.\n` +
      `• \`${prefix}fixtures <team>\` - Get the next 5 fixtures for a specific team.\n` +
      `• \`${prefix}player <name>\` - Find player stats, price, and injury news.\n` +
      `💬 *Group Mention Support:*\n` +
      `You can also mention/tag the bot in a group chat and ask questions naturally:\n` +
      `- _"@Bot when is the deadline?"_\n` +
      `- _"@Bot show fixtures for Chelsea"_\n` +
      `- _"@Bot search player Haaland"_`;
    
    await message.reply(response);
  }
};
