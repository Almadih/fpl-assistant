const fplService = require('../services/fplService');
const { getStatusLabel } = require('../utils/formatter');

module.exports = {
  name: 'player',
  description: 'Searches for a player and displays their stats.',
  async execute(client, message, args) {
    try {
      if (args.length === 0) {
        await message.reply("👤 Please specify a player name.\nExample: `!player Wirtz` or `!player Haaland`.");
        return;
      }

      const query = args.join(' ');
      let matches = await fplService.searchPlayer(query);

      if (matches.length === 0) {
        await message.reply(`❌ No players found matching "${query}".`);
        return;
      }

      // If multiple matches, check for an exact match to avoid prompting if they typed a specific name
      if (matches.length > 1) {
        const exactMatch = matches.find(
          p => p.name.toLowerCase() === query.toLowerCase() || p.fullName.toLowerCase() === query.toLowerCase()
        );
        if (exactMatch) {
          matches = [exactMatch];
        }
      }

      if (matches.length > 1) {
        let response = `🔍 *Multiple players found for "${query}":*\n`;
        matches.slice(0, 6).forEach((p, idx) => {
          response += `\n${idx + 1}. *${p.fullName}* (${p.team}) - ${p.position}`;
        });
        if (matches.length > 6) {
          response += `\n• ...and ${matches.length - 6} more matches.`;
        }
        response += `\n\n💡 _Tip: Try typing the full name or their specific web name for an exact match._`;
        await message.reply(response);
        return;
      }

      // Single match
      const p = matches[0];
      const statusText = getStatusLabel(p.status);
      const chanceText = p.chanceOfPlaying !== null ? ` (${p.chanceOfPlaying}% chance of playing)` : '';

      let response = 
        `👤 *${p.fullName}* (${p.team})\n` +
        `🏃 *Position:* ${p.position} | *Price:* £${p.price}m\n` +
        `📊 *Total Points:* ${p.totalPoints} | *Selected By:* ${p.selectedByPercent}%\n` +
        `📈 *Form:* ${p.form} | *GW Points:* ${p.eventPoints}\n` +
        `🏥 *Status:* ${statusText}${chanceText}\n`;

      if (p.status !== 'a' && p.news) {
        response += `⚠️ *News:* _${p.news}_\n`;
      }

      response += 
        `\n⚽ *Season Stats:*\n` +
        `• Goals: ${p.goals}\n` +
        `• Assists: ${p.assists}\n` +
        `• Clean Sheets: ${p.cleanSheets}`;

      await message.reply(response);
    } catch (error) {
      console.error('Error in player command:', error.message);
      await message.reply("❌ Error retrieving player stats. Please try again later.");
    }
  }
};
