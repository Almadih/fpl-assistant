require('dotenv').config();
const path = require('path');

module.exports = {
  prefix: process.env.PREFIX || '!',
  chromePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  fplApiBase: process.env.FPL_API_BASE || 'https://fantasy.premierleague.com/api',
  leagueId: process.env.LEAGUE_ID || '629254',
  dbPath: path.resolve(__dirname, '../data/db.json'),
  authPath: path.resolve(__dirname, '../data/.wwebjs_auth'),
  // The WhatsApp group chat ID that receives all periodic broadcasts
  targetGroupId: process.env.TARGET_GROUP_ID || '120363405152085258@g.us',
  botId: process.env.BOT_ID || ''
};
