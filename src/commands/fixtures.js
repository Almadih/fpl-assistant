const fplService = require('../services/fplService');

module.exports = {
  name: 'fixtures',
  description: 'Shows fixtures for the next gameweek or a specific team.',
  async execute(client, message, args) {
    console.log(args)
    try {
      if (args.length === 0) {
        // Show next gameweek fixtures
        const nextGw = await fplService.getNextGameweek();
        if (!nextGw) {
          await message.reply("🏆 No upcoming gameweeks found.");
          return;
        }

        const fixtures = await fplService.getFixturesForGameweek(nextGw.id);
        if (fixtures.length === 0) {
          await message.reply(`📅 No fixtures found for *${nextGw.name}*.`);
          return;
        }

        fixtures.sort((a, b) => a.kickoff - b.kickoff);

        let response = `⚽ *Fixtures: ${nextGw.name}* ⚽\n`;
        let lastDate = '';

        fixtures.forEach(f => {
          const dateStr = f.kickoff.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
          const timeStr = f.kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          if (dateStr !== lastDate) {
            response += `\n📅 *${dateStr}*\n`;
            lastDate = dateStr;
          }

          const statusStr = f.started ? (f.finished ? `[FT ${f.score}]` : `[LIVE ${f.score}]`) : `(${timeStr})`;
          response += `• ${f.home} vs ${f.away} ${statusStr}\n`;
        });

        await message.reply(response);
      } else {
        // Show specific team fixtures
        const query = args.join(' ').trim();

        if (!query) {
          await message.reply('❓ Please specify a team name, e.g. _"fixtures Arsenal"_ or _"fixtures Man City"_.');
          return;
        }


        const teamFixInfo = await fplService.getFixturesForTeam(query);

        if (!teamFixInfo) {
          await message.reply(`❌ Team "${query}" not found. Try searching with a valid team name (e.g. "Arsenal", "Man City").`);
          return;
        }

        let response = `⚽ *Upcoming Fixtures: ${teamFixInfo.teamName} (${teamFixInfo.teamShort})* ⚽\n`;
        teamFixInfo.fixtures.forEach(f => {
          const dateStr = f.kickoff.toLocaleDateString([], { month: 'short', day: 'numeric' });
          const timeStr = f.kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          const venue = f.isHome ? 'H' : 'A';
          const opp = f.isHome ? f.away : f.home;
          response += `\n• *GW${f.gameweek}*: vs ${opp} (${venue}) | ${dateStr} ${timeStr} | FDR: *${f.difficulty}*`;
        });

        await message.reply(response);
      }
    } catch (error) {
      console.error('Error in fixtures command:', error.message);
      await message.reply("❌ Error fetching fixtures. Please try again later.");
    }
  }
};
