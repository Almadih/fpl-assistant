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
      `• \`${prefix}rank <name>\` - Get rank and points for a manager in the league.\n` +
      `• \`${prefix}league\` - View top league standings table.\n\n` +
      `💬 *Group Mention Support:*\n` +
      `You can also mention/tag the bot in a group chat and ask questions naturally:\n` +
      `- _"@Bot when is the deadline?"_\n` +
      `- _"@Bot show fixtures for Chelsea"_\n` +
      `- _"@Bot search player Haaland"_\n` +
      `- _"@Bot what is the rank of sahl"_\n` +
      `- _"@Bot show league standings"_`;
    
    await message.reply(response);
  }
};
