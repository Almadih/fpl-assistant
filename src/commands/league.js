const fplService = require('../services/fplService');
const config = require('../config');

function formatRankMovement(rank, lastRank) {
  if (!lastRank || lastRank === 0) {
    return '🆕';
  }
  if (rank < lastRank) {
    return `⬆️ (+${lastRank - rank})`;
  }
  if (rank > lastRank) {
    return `⬇️ (-${rank - lastRank})`;
  }
  return '➡️ (=)';
}

function getMedal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}.`;
}

module.exports = {
  name: 'league',
  aliases: ['rank', 'standings', 'leaguerank'],
  description: 'Shows league standings or gets the current rank and points for a player in the league.',
  async execute(client, message, args) {
    try {
      const query = args.join(' ').trim();
      const leagueId = config.leagueId;

      // 1. If no query, display top league standings table
      if (!query) {
        const { league, standings } = await fplService.getLeagueStandings(leagueId);
        const topEntries = standings.slice(0, 10);

        let response = `🏆 *${league.name} — Standings* 🏆\n` +
                       `━━━━━━━━━━━━━━━━━━━━\n`;

        topEntries.forEach(entry => {
          const medal = getMedal(entry.rank);
          const move = formatRankMovement(entry.rank, entry.last_rank);
          response += `${medal} *${entry.player_name}* (${entry.entry_name})\n` +
                      `   📊 *${entry.total} pts* | GW: ${entry.event_total} pts | ${move}\n`;
        });

        response += `━━━━━━━━━━━━━━━━━━━━\n` +
                    `👥 *Total Managers:* ${standings.length}\n\n` +
                    `💡 _To check a specific manager or team:_\n` +
                    `\`${config.prefix}rank <name>\` (e.g. \`${config.prefix}rank sahl\`)`;

        await message.reply(response);
        return;
      }

      // 2. Search for a specific player/team in the league
      const result = await fplService.searchLeaguePlayer(query, leagueId);
      const { league, totalEntries } = result;
      let matches = result.matches;

      if (matches.length === 0) {
        await message.reply(
          `❌ No manager or team found matching "*${query}*" in league *${league.name}*.\n\n` +
          `💡 Use \`${config.prefix}rank\` without arguments to see top standings.`
        );
        return;
      }

      // If multiple matches, check for exact match
      if (matches.length > 1) {
        const queryLower = query.toLowerCase();
        const exactMatch = matches.find(
          m => m.player_name.toLowerCase() === queryLower || m.entry_name.toLowerCase() === queryLower
        );
        if (exactMatch) {
          matches = [exactMatch];
        }
      }

      // If still multiple matches, list them
      if (matches.length > 1) {
        let response = `🔍 *Multiple managers found for "${query}" in ${league.name}:*\n\n`;
        matches.slice(0, 8).forEach((m, idx) => {
          const move = formatRankMovement(m.rank, m.last_rank);
          response += `${idx + 1}. *${m.player_name}* (${m.entry_name})\n` +
                      `   🏅 Rank: #${m.rank} | 📊 ${m.total} pts (GW: ${m.event_total}) | ${move}\n`;
        });

        if (matches.length > 8) {
          response += `\n• ...and ${matches.length - 8} more matches.`;
        }
        response += `\n💡 _Tip: Search with the exact manager name or team name for direct stats._`;
        await message.reply(response);
        return;
      }

      // Single match found
      const entry = matches[0];
      const move = formatRankMovement(entry.rank, entry.last_rank);

      const response =
        `🏆 *${league.name}*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Manager:* ${entry.player_name}\n` +
        `🛡️ *Team:* ${entry.entry_name}\n` +
        `🏅 *Rank:* #${entry.rank} of ${totalEntries}  ${move}\n` +
        `📊 *Total Points:* ${entry.total} pts\n` +
        `⚡ *Gameweek Points:* ${entry.event_total} pts\n` +
        `━━━━━━━━━━━━━━━━━━━━`;

      await message.reply(response);
    } catch (error) {
      console.error('Error in league command:', error.message);
      await message.reply('❌ Error retrieving league rank and points. Please try again later.');
    }
  }
};
