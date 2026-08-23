const fplService = require('../services/fplService');
const config = require('../config');

const CHIP_NAMES = {
  '3xc': '⚡ Triple Captain',
  'bboost': '🛡️ Bench Boost',
  'wildcard': '🃏 Wildcard',
  'freehit': '🆓 Free Hit'
};

module.exports = {
  name: 'captains',
  aliases: ['chips', 'captaintracker', 'cappicks'],
  description: 'Tracks captain selections and chips played in the mini-league.',
  async execute(client, message, args) {
    try {
      const gwArg = args.find(a => /^\d+$/.test(a));
      const gwId = gwArg ? parseInt(gwArg) : null;

      const data = await fplService.getLeagueGameweekPicks(gwId, config.leagueId);
      const { league, gameweek, totalManagers, analyzedManagers, captains, chips } = data;

      if (analyzedManagers === 0) {
        await message.reply(`⚠️ No team picks available for *${gameweek.name}* yet. Picks become visible once the deadline passes.`);
        return;
      }

      let response = `👑 *${league.name} — Captains & Chips (${gameweek.name})* 👑\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n\n` +
                     `🎯 *Top Captain Picks:*\n`;

      captains.slice(0, 7).forEach((cap, idx) => {
        const pct = Math.round((cap.count / analyzedManagers) * 100);
        const tcNote = cap.isTripleCount > 0 ? ` _(${cap.isTripleCount}x TC)_` : '';
        response += `${idx + 1}. *${cap.player.name}* (${cap.player.teamShort}): *${cap.count} managers* (${pct}%)${tcNote}\n`;
      });

      if (captains.length > 7) {
        const remainingCount = captains.slice(7).reduce((sum, c) => sum + c.count, 0);
        response += `• _Other captains: ${remainingCount} managers_\n`;
      }

      // Check chips played
      const activeChipsList = Object.entries(chips).filter(([_, managers]) => managers.length > 0);

      response += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                  `🃏 *Chips Played This GW:*\n`;

      if (activeChipsList.length === 0) {
        response += `• _No chips active this gameweek._\n`;
      } else {
        activeChipsList.forEach(([chipKey, managers]) => {
          const chipLabel = CHIP_NAMES[chipKey] || chipKey;
          const managerNames = managers.map(m => m.managerName).slice(0, 5).join(', ');
          const extra = managers.length > 5 ? ` +${managers.length - 5} more` : '';
          response += `• ${chipLabel}: *${managers.length}* (${managerNames}${extra})\n`;
        });
      }

      response += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                  `👥 *Managers Analyzed:* ${analyzedManagers}/${totalManagers}\n` +
                  `💡 _Tip: Use \`${config.prefix}captain\` for next GW captain recommendations._`;

      await message.reply(response);
    } catch (error) {
      console.error('Error in captains command:', error.message);
      await message.reply('❌ Error fetching captain and chip data. Please try again later.');
    }
  }
};
