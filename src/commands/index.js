const fs = require('fs');
const path = require('path');
const config = require('../config');

const commands = {};

// Load all command modules in the directory
const commandFiles = fs.readdirSync(__dirname).filter(file => file !== 'index.js' && file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./${file}`);
  commands[command.name] = command;
  if (command.aliases && Array.isArray(command.aliases)) {
    for (const alias of command.aliases) {
      commands[alias] = command;
    }
  }
  console.log(`[Commands] Loaded command: ${command.name}`);
}

async function handleMessage(client, message) {
  const body = message.body || '';

  // Never respond to messages sent by the bot itself
  if (message.fromMe) return;

  const botId = config.botId
  const mentionedId = `${botId}@lid`

  const isGroupMessage = message.from.endsWith('@g.us');
  const isDirectMessage = message.from.endsWith('@c.us');

  // In groups: only respond when explicitly tagged.
  // Check the raw body for @<number> (most reliable) AND mentionedIds as a fallback.
  const mentionedInBody = body.includes(`@${botId}`);
  const mentionedInIds = Array.isArray(message.mentionedIds) && message.mentionedIds.includes(mentionedId);
  const isMentioned = isGroupMessage && (mentionedInBody || mentionedInIds);

  // In DMs: always respond
  if (!isMentioned && !isDirectMessage) return;



  console.log(`[Commands] Mention/DM received in chat: ${message.from}`);

  // Strip @mention tags from the body, then trim
  const text = body.replace(/@\S+/g, '').trim();
  const textLower = text.toLowerCase();

  // --- 1. Prefix command parsing (e.g. !fixtures Arsenal, !player Wirtz, !rank sahl) ---
  if (text.startsWith(config.prefix)) {
    const parts = text.slice(config.prefix.length).trim().split(/ +/);
    const commandName = parts.shift().toLowerCase();
    const args = parts;

    const command = commands[commandName];
    console.log({command})
    if (command) {
      console.log(`[Commands] Executing prefix command "${commandName}"`);
      try {
        await command.execute(client, message, args);
      } catch (err) {
        console.error(`[Commands] Error in command "${commandName}":`, err.message);
        await message.reply('❌ An error occurred while executing that command.');
      }
    } else {
      await message.reply(`❓ Unknown command *${config.prefix}${commandName}*. Say _"help"_ to see what I can do.`);
    }
    return;
  }

  // --- 2. Natural language parsing ---
  if (textLower.includes('help') || textLower.includes('menu') || textLower.includes('commands') || textLower.includes('اوامر') || textLower.includes('مساعدة')) {
    await commands['help'].execute(client, message, []);
  }
  else if (textLower.includes('deadline') || textLower.includes('when is the deadline') || textLower.includes('موعد الديدلاين') || textLower.includes('ديدلاين')) {
    await commands['deadline'].execute(client, message, []);
  }
  else if (textLower.includes('captains') || textLower.includes('chips') || textLower.includes('الكباتن') || textLower.includes('الخواص') || textLower.includes('who captained') || textLower.includes('everyone captain')) {
    const gwNumber = textLower.match(/\b\d+\b/);
    const args = gwNumber ? [gwNumber[0]] : [];
    await commands['captains'].execute(client, message, args);
  }
  else if (textLower.includes('best captain') || textLower.includes('captain pick') || textLower.includes('recommend captain') || textLower.includes('who to captain') || textLower.includes('who should i captain') || textLower.includes('من اكبتن') || textLower.includes('كابتن') || textLower.includes('captain')) {
    const gwNumber = textLower.match(/\b\d+\b/);
    const args = gwNumber ? [gwNumber[0]] : [];
    await commands['captain'].execute(client, message, args);
  }
  else if (textLower.includes('review') || textLower.includes('awards') || textLower.includes('جوائز') || textLower.includes('ملخص') || textLower.includes('king of the') || textLower.includes('flop') || textLower.includes('bench warmer') || textLower.includes('who won')) {
    const gwNumber = textLower.match(/\b\d+\b/);
    const args = gwNumber ? [gwNumber[0]] : [];
    await commands['review'].execute(client, message, args);
  }
  else if (textLower.includes('rank') || textLower.includes('league') || textLower.includes('standings') || textLower.includes('ترتيب') || textLower.includes('الدوري')) {
    const keywords = new Set([
      'rank', 'league', 'standings', 'points', 'for', 'in', 'show', 'get',
      'what', 'is', 'my', 'the', 'of', 'who', 'score', 'ترتيب', 'الدوري', 'نقاط', 'في'
    ]);
    const query = textLower.split(/ +/).filter(w => !keywords.has(w) && w.length > 0);
    await commands['league'].execute(client, message, query);
  }
  else if (/\b(fixtures?|games?|matches?|مباريات|جدول)\b/i.test(textLower)) {
    // Strip noise words to isolate the team name
    const noiseWords = new Set([
      'fixture', 'fixtures', 'game', 'games', 'match', 'matches',
      'for', 'show', 'get', 'what', 'are', 'the', 'next', 'upcoming',
      'of', 'schedule', 'calendar', 'list', 'week', 'gameweek', 'this',
      'مباريات', 'جدول'
    ]);
    const teamWords = textLower.split(/ +/).filter(w => !noiseWords.has(w) && w.length > 0);
    await commands['fixtures'].execute(client, message, teamWords);
  }
  else if (textLower.includes('player') || textLower.includes('stats') || textLower.includes('search') || textLower.includes('who is') || textLower.includes("who's") || textLower.includes('لاعب')) {
    const keywords = new Set(['player', 'stats', 'search', 'who', 'is', 'for', 'show', 'details', 'find', "who's", 'لاعب']);
    const playerQuery = textLower.split(/ +/).filter(w => !keywords.has(w) && w.length > 0);
    await commands['player'].execute(client, message, playerQuery);
  }
  else if (textLower.includes('scout') || textLower.includes('scouts') || textLower.includes('الكشاف') || textLower.includes('تشكيلة الكشاف')) {
    const gwNumber = textLower.match(/\b\d+\b/);
    const args = gwNumber ? [gwNumber[0]] : [];
    await commands['scouts'].execute(client, message, args);
  }
  else if (textLower.includes('chatid') || textLower.includes('chat id') || textLower.includes('group id')) {
    await commands['chatid'].execute(client, message, []);
  }
  else {
    // Generic fallback
    await message.reply(
      `🤖 *FPL Assistant here!*\n\n` +
      `Ask me naturally or use a command:\n` +
      `• _"when is the deadline?"_\n` +
      `• _"who to captain?"_ or \`!captain\`\n` +
      `• _"who did everyone captain?"_ or \`!captains\`\n` +
      `• _"scout selection"_ or \`!scouts\`\n` +
      `• _"gameweek review"_ or \`!review\`\n` +
      `• _"rank for sahl"_ or \`!rank sahl\`\n` +
      `• _"fixtures for Chelsea"_ or \`!fixtures Chelsea\`\n` +
      `• _"stats for Haaland"_ or \`!player Haaland\`\n` +
      `• \`!league\` — to view league standings\n` +
      `• \`!help\` — to see all commands`
    );
  }
}

module.exports = {
  handleMessage
};
