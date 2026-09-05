const { MessageMedia } = require('whatsapp-web.js');
const fplService = require('../services/fplService');

module.exports = {
  name: 'scouts',
  aliases: ['scout', 'scoutselection', 'scoutpicks'],
  description: 'Fetches the official Premier League FPL Scout Selection for the gameweek.',
  async execute(client, message, args) {
    try {
      // Look for a gameweek number in the arguments
      const gwArg = args.find(a => /^\d+$/.test(a));
      const requestedGw = gwArg ? parseInt(gwArg) : null;

      const scoutData = await fplService.getScoutSelection(requestedGw);

      if (!scoutData) {
        await message.reply('⚠️ No Scout Selection articles could be found at this time. Please try again later.');
        return;
      }

      if (scoutData.notFound) {
        let msg = `⚠️ *Scout Selection for Gameweek ${scoutData.requestedGw} has not been published yet.*\n`;
        msg += `The Scout usually publishes the official squad 24–48 hours prior to the Gameweek deadline.\n`;
        if (scoutData.latestAvailableGw) {
          msg += `\n💡 _Tip: You can view Gameweek ${scoutData.latestAvailableGw} using \`!scout ${scoutData.latestAvailableGw}\`._`;
        }
        await message.reply(msg);
        return;
      }

      let responseText = '';

      if (!scoutData.isRequestedGwMatch && scoutData.requestedGw && scoutData.requestedGw !== scoutData.gameweek) {
        responseText += `ℹ️ _Scout Selection for Gameweek ${scoutData.requestedGw} has not been released yet. Showing latest available for Gameweek ${scoutData.gameweek}:_\n\n`;
      }

      responseText += `🛡️ *FPL Scout Selection — Gameweek ${scoutData.gameweek}* 🛡️\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n`;

      if (scoutData.summary) {
        responseText += `📝 _"${scoutData.summary}"_\n\n`;
      }

      if (scoutData.captain) {
        responseText += `👑 *Captain:* ${scoutData.captain}\n`;
      }
      if (scoutData.viceCaptain) {
        responseText += `🥈 *Vice-Captain:* ${scoutData.viceCaptain}\n`;
      }
      responseText += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      // Goalkeepers
      if (scoutData.squad.gkp && scoutData.squad.gkp.length > 0) {
        responseText += `🧤 *Goalkeeper:*\n`;
        scoutData.squad.gkp.forEach(p => {
          const badge = p.isCaptain ? ' *(C)*' : (p.isViceCaptain ? ' *(V)*' : '');
          responseText += `• *${p.webName}* (${p.clubShort})${badge} - £${p.price}m\n`;
        });
        responseText += `\n`;
      }

      // Defenders
      if (scoutData.squad.def && scoutData.squad.def.length > 0) {
        responseText += `🛡️ *Defenders:*\n`;
        scoutData.squad.def.forEach(p => {
          const badge = p.isCaptain ? ' *(C)*' : (p.isViceCaptain ? ' *(V)*' : '');
          responseText += `• *${p.webName}* (${p.clubShort})${badge} - £${p.price}m\n`;
        });
        responseText += `\n`;
      }

      // Midfielders
      if (scoutData.squad.mid && scoutData.squad.mid.length > 0) {
        responseText += `⚡ *Midfielders:*\n`;
        scoutData.squad.mid.forEach(p => {
          const badge = p.isCaptain ? ' *(C)*' : (p.isViceCaptain ? ' *(V)*' : '');
          responseText += `• *${p.webName}* (${p.clubShort})${badge} - £${p.price}m\n`;
        });
        responseText += `\n`;
      }

      // Forwards
      if (scoutData.squad.fwd && scoutData.squad.fwd.length > 0) {
        responseText += `🎯 *Forwards:*\n`;
        scoutData.squad.fwd.forEach(p => {
          const badge = p.isCaptain ? ' *(C)*' : (p.isViceCaptain ? ' *(V)*' : '');
          responseText += `• *${p.webName}* (${p.clubShort})${badge} - £${p.price}m\n`;
        });
        responseText += `\n`;
      }

      responseText += `━━━━━━━━━━━━━━━━━━━━\n` +
                      `📰 _Source: Official Premier League Scout Selection_`;

      // Attempt sending with graphic image if available
      if (scoutData.graphicImageUrl) {
        try {
          const media = await MessageMedia.fromUrl(scoutData.graphicImageUrl);
          await client.sendMessage(message.from, media, { caption: responseText });
          return;
        } catch (imgErr) {
          console.warn('[Scouts] Failed to load pitch graphic image, falling back to text reply:', imgErr.message);
        }
      }

      // Fallback to text message
      await message.reply(responseText);
    } catch (error) {
      console.error('Error in scouts command:', error.message);
      await message.reply('❌ Error retrieving FPL Scout Selection. Please try again later.');
    }
  }
};
