const fplService = require('../services/fplService');
const config = require('../config');

module.exports = {
  name: 'review',
  aliases: ['awards', 'gwreview', 'summary'],
  description: 'Displays the Gameweek review, awards, and stats summary for the mini-league.',
  async execute(client, message, args) {
    try {
      const gwArg = args.find(a => /^\d+$/.test(a));
      const gwId = gwArg ? parseInt(gwArg) : null;

      const review = await fplService.getGameweekReview(gwId, config.leagueId);
      const { league, gameweek, empty } = review;

      if (empty) {
        await message.reply(`⚠️ No gameweek data available for *${gameweek.name}* yet.`);
        return;
      }

      let response = `🏆 *${league.name} — ${gameweek.name} Awards & Review* 🏆\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n\n`;

      // 1. King of the Week
      response += `👑 *King of the Gameweek:*\n` +
                  `🥇 *${review.king.manager}* (${review.king.team})\n` +
                  `   ⚡ *${review.king.points} pts* (Rank: #${review.king.rank})\n\n`;

      // 2. Flop of the Week
      response += `💩 *Flop of the Gameweek:*\n` +
                  `🥔 *${review.flop.manager}* (${review.flop.team})\n` +
                  `   ⚡ *${review.flop.points} pts* (Rank: #${review.flop.rank})\n\n`;

      // 3. Bench Warmer
      if (review.benchWarmer) {
        response += `🪑 *Bench Warmer Award:*\n` +
                    `🥶 *${review.benchWarmer.manager}* (${review.benchWarmer.team})\n` +
                    `   📊 Left *${review.benchWarmer.benchPoints} pts* on the bench!\n\n`;
      }

      // 4. Hit Master
      if (review.hitMaster) {
        response += `💸 *Transfer Hitman:*\n` +
                    `🎰 *${review.hitMaster.manager}* (${review.hitMaster.team})\n` +
                    `   ⚠️ Made ${review.hitMaster.transfers} transfers (-${review.hitMaster.cost} pts)\n\n`;
      }

      // 5. Captain Mastermind
      if (review.bestCaptain) {
        const tcText = review.bestCaptain.isTC ? ' (Triple Captain)' : '';
        response += `🎯 *Captain Mastermind:*\n` +
                    `🧠 *${review.bestCaptain.manager}* captained *${review.bestCaptain.captainName}* (*${review.bestCaptain.captainPoints} pts*${tcText})\n\n`;
      }

      // 6. Biggest Climber / Faller
      if (review.biggestClimber) {
        response += `📈 *Biggest Climber:* *${review.biggestClimber.manager}* (+${review.biggestClimber.climbed} spots to #${review.biggestClimber.newRank})\n`;
      }
      if (review.biggestFaller) {
        response += `📉 *Biggest Faller:* *${review.biggestFaller.manager}* (-${review.biggestFaller.dropped} spots to #${review.biggestFaller.newRank})\n`;
      }

      response += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                  `📊 *League Stats:*\n` +
                  `• Average GW Score: *${review.avgGwPoints} pts*\n` +
                  `• Total Managers: *${review.totalManagers}*\n\n` +
                  `💡 _Tip: Check full standings anytime with \`${config.prefix}league\`_`;

      await message.reply(response);
    } catch (error) {
      console.error('Error in review command:', error.message);
      await message.reply('❌ Error generating Gameweek review. Please try again later.');
    }
  }
};
