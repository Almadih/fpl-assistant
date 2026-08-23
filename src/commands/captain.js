const fplService = require('../services/fplService');
const config = require('../config');

function getFdrEmoji(fdr) {
  if (fdr <= 2) return '🟢 Easy';
  if (fdr === 3) return '🟡 Medium';
  return '🔴 Hard';
}

module.exports = {
  name: 'captain',
  aliases: ['cap', 'bestcaptain', 'captaincy'],
  description: 'Recommends top captain picks and differentials for the upcoming gameweek.',
  async execute(client, message, args) {
    try {
      const gwArg = args.find(a => /^\d+$/.test(a));
      const gwId = gwArg ? parseInt(gwArg) : null;

      const recommendations = await fplService.getCaptainRecommendations(gwId);
      const { gameweek, topPicks, differential } = recommendations;

      if (!topPicks || topPicks.length === 0) {
        await message.reply(`⚠️ Unable to generate captain recommendations for *${gameweek.name}*.`);
        return;
      }

      const medals = ['🥇', '🥈', '🥉', '4️⃣'];

      let response = `🎯 *Captain Recommendations — ${gameweek.name}* 🎯\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n\n` +
                     `🔥 *Top Captain Picks:*\n\n`;

      topPicks.forEach((p, idx) => {
        const medal = medals[idx] || `${idx + 1}.`;
        const diffText = getFdrEmoji(p.fdr);
        response += `${medal} *${p.fullName}* (${p.teamShort}) - £${p.price}m\n` +
                    `   ⚽ *Fixture:* vs ${p.fixture} (${diffText})\n` +
                    `   📊 *Form:* ${p.form} | *Selected:* ${p.selectedByPercent}%\n\n`;
      });

      if (differential) {
        const diffText = getFdrEmoji(differential.fdr);
        response += `━━━━━━━━━━━━━━━━━━━━\n` +
                    `💎 *Differential Pick (<10% Ownership):*\n` +
                    `⭐ *${differential.fullName}* (${differential.teamShort}) - £${differential.price}m\n` +
                    `   ⚽ *Fixture:* vs ${differential.fixture} (${diffText})\n` +
                    `   📊 *Form:* ${differential.form} | *Selected:* ${differential.selectedByPercent}%\n\n`;
      }

      response += `━━━━━━━━━━━━━━━━━━━━\n` +
                  `💡 _Tip: After the deadline passes, use \`${config.prefix}captains\` to see who everyone in your league captained!_`;

      await message.reply(response);
    } catch (error) {
      console.error('Error in captain command:', error.message);
      await message.reply('❌ Error generating captain recommendations. Please try again later.');
    }
  }
};
