const fplService = require('../services/fplService');
const { formatCountdown } = require('../utils/formatter');

module.exports = {
  name: 'deadline',
  description: 'Shows the next FPL gameweek deadline and countdown.',
  async execute(client, message, args) {
    try {
      const nextGw = await fplService.getNextGameweek();
      if (!nextGw) {
        await message.reply("🏆 No upcoming gameweek deadlines were found. The season might be finished or not started yet.");
        return;
      }

      const deadlineTime = new Date(nextGw.deadline_time).getTime();
      const now = Date.now();
      const timeDiff = deadlineTime - now;

      const formattedDeadline = new Date(nextGw.deadline_time).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      if (timeDiff <= 0) {
        await message.reply(`🏆 *${nextGw.name}* has already started!\n📅 *Deadline was:* ${formattedDeadline}`);
        return;
      }

      const countdownText = formatCountdown(timeDiff);

      // Fetch upcoming fixtures for the alert
      let fixturesText = '';
      try {
        const fixtures = await fplService.getFixturesForGameweek(nextGw.id);
        if (fixtures.length > 0) {
          fixturesText = '\n⚽ *Upcoming GW Fixtures:*';
          fixtures.sort((a, b) => a.kickoff - b.kickoff);
          fixtures.slice(0, 5).forEach(f => {
            const formattedTime = f.kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            fixturesText += `\n• ${f.homeShort} vs ${f.awayShort} (${formattedTime})`;
          });
          if (fixtures.length > 5) {
            fixturesText += `\n• ...and ${fixtures.length - 5} more matches`;
          }
        }
      } catch (fErr) {
        console.error('Error fetching fixtures for deadline command:', fErr.message);
      }

      const response = 
        `⏳ *FPL DEADLINE COUNTDOWN* ⏳\n\n` +
        `🏆 *${nextGw.name}*\n` +
        `📅 *Deadline:* ${formattedDeadline}\n` +
        `⏰ *Time Remaining:* ${countdownText}\n` +
        fixturesText;

      await message.reply(response);
    } catch (error) {
      console.error('Error in deadline command:', error.message);
      await message.reply("❌ Error fetching deadline information. Please try again later.");
    }
  }
};
