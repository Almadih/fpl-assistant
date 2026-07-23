const cron = require('node-cron');
const fplService = require('./fplService');
const storageService = require('./storageService');
const { formatCountdown, getStatusLabel } = require('../utils/formatter');
const config = require('../config');

// Deadline alert configuration
const DEADLINE_ALERTS = [
  { id: '1h', limit: 1 * 60 * 60 * 1000, text: '🕒 *1 HOUR* remaining until the deadline!' },
  { id: '2h', limit: 2 * 60 * 60 * 1000, text: '🕒 *2 HOURS* remaining until the deadline!' },
  { id: '12h', limit: 12 * 60 * 60 * 1000, text: '🕒 *12 HOURS* remaining until the deadline!' },
  { id: '24h', limit: 24 * 60 * 60 * 1000, text: '🚨 *24 HOURS* remaining until the deadline!' }
];

async function broadcastMessage(client, message) {
  const groupId = config.targetGroupId;

  if (!groupId) {
    console.warn('[Scheduler] TARGET_GROUP_ID is not set. Skipping broadcast.');
    return;
  }

  console.log(`[Scheduler] Sending periodic update to target group: ${groupId}`);
  try {
    await client.sendMessage(groupId, message);
  } catch (err) {
    console.error(`[Scheduler] Failed to send message to target group (${groupId}):`, err.message);
  }
}


async function checkDeadlines(client) {
  try {
    const nextGw = await fplService.getNextGameweek();
    if (!nextGw) return;

    const deadlineTime = new Date(nextGw.deadline_time).getTime();
    const now = Date.now();
    const timeDiff = deadlineTime - now;

    if (timeDiff <= 0) return; // GW already started

    // Find the most urgent alert that is applicable
    const activeAlerts = DEADLINE_ALERTS.filter(alert => timeDiff <= alert.limit);
    if (activeAlerts.length === 0) return;

    // Pick the most urgent alert (smallest limit)
    activeAlerts.sort((a, b) => a.limit - b.limit);
    const primaryAlert = activeAlerts[0];

    // Check if this alert has already been sent
    const sentAlerts = storageService.getLastDeadlineAlerts();
    const gwAlerts = sentAlerts[nextGw.id] || [];

    if (!gwAlerts.includes(primaryAlert.id)) {
      console.log(`[Scheduler] Triggering ${primaryAlert.id} alert for GW${nextGw.id}...`);

      // Fetch fixtures for this gameweek to display in the alert
      let fixturesText = '';
      try {
        const fixtures = await fplService.getFixturesForGameweek(nextGw.id);
        if (fixtures.length > 0) {
          fixturesText = '\n⚽ *Gameweek Fixtures:*';
          // Sort fixtures by kickoff time
          fixtures.sort((a, b) => a.kickoff - b.kickoff);
          fixtures.slice(0, 8).forEach(f => {
            const formattedTime = f.kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = f.kickoff.toLocaleDateString([], { month: 'short', day: 'numeric' });
            fixturesText += `\n• ${f.homeShort} vs ${f.awayShort} (${dateStr} ${formattedTime})`;
          });
          if (fixtures.length > 8) {
            fixturesText += `\n• ...and ${fixtures.length - 8} more matches`;
          }
        }
      } catch (err) {
        console.error('[Scheduler] Failed to load fixtures for alert:', err.message);
      }

      const formattedDeadline = new Date(nextGw.deadline_time).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const message = 
        `⚠️ *FPL DEADLINE ALERT* ⚠️\n\n` +
        `🏆 *${nextGw.name}*\n` +
        `${primaryAlert.text}\n\n` +
        `📅 *Deadline:* ${formattedDeadline}\n` +
        `⏳ *Countdown:* ${formatCountdown(timeDiff)}\n` +
        fixturesText + `\n\n` +
        `Make sure to save your transfers and choose your captain! 🚀`;

      await broadcastMessage(client, message);

      // Save alert as sent, and also mark all less urgent alerts as sent/skipped
      storageService.saveDeadlineAlert(nextGw.id, primaryAlert.id);
      DEADLINE_ALERTS.forEach(alert => {
        if (alert.limit > primaryAlert.limit) {
          storageService.saveDeadlineAlert(nextGw.id, alert.id);
        }
      });
    }
  } catch (err) {
    console.error('[Scheduler] Error checking deadlines:', err.message);
  }
}

async function checkPriceAndInjuries(client) {
  try {
    console.log('[Scheduler] Checking player price and injury updates...');
    const bootstrap = await fplService.getBootstrapData();
    const cache = storageService.getPlayerCache();
    const isFirstRun = Object.keys(cache).length === 0;

    const currentPlayers = bootstrap.elements;
    const newCache = {};

    const rises = [];
    const falls = [];
    const injured = [];
    const recovered = [];

    // Helper map of team names
    const teamsMap = {};
    bootstrap.teams.forEach(t => { teamsMap[t.id] = t.name; });

    currentPlayers.forEach(p => {
      const pid = p.id.toString();
      const teamName = teamsMap[p.team] || 'Unknown';
      const posLabel = p.element_type === 1 ? 'GKP' : p.element_type === 2 ? 'DEF' : p.element_type === 3 ? 'MID' : 'FWD';
      
      const currentPrice = p.now_cost;
      const currentStatus = p.status;
      const currentNews = p.news;

      newCache[pid] = {
        name: p.web_name,
        team: teamName,
        position: posLabel,
        price: currentPrice,
        status: currentStatus,
        news: currentNews
      };

      if (!isFirstRun && cache[pid]) {
        const cached = cache[pid];

        // 1. Price check
        if (currentPrice !== cached.price) {
          const diff = (currentPrice - cached.price) / 10;
          const formattedDiff = diff > 0 ? `+£${diff.toFixed(1)}m` : `-£${Math.abs(diff).toFixed(1)}m`;
          const newPriceStr = (currentPrice / 10).toFixed(1);
          
          if (currentPrice > cached.price) {
            rises.push(`• *${p.web_name}* (${teamName}) - ${posLabel} | £${newPriceStr}m (${formattedDiff})`);
          } else {
            falls.push(`• *${p.web_name}* (${teamName}) - ${posLabel} | £${newPriceStr}m (${formattedDiff})`);
          }
        }

        // 2. Injury/Status check
        if (currentStatus !== cached.status || currentNews !== cached.news) {
          const newPriceStr = (currentPrice / 10).toFixed(1);
          
          if (currentStatus === 'a') {
            // Player is available now
            recovered.push(`• *${p.web_name}* (${teamName}) - ${posLabel} | Now fit & available! 🟢`);
          } else if (currentStatus !== 'a') {
            // Player is injured/suspended/doubtful
            const chanceText = p.chance_of_playing_next_round !== null ? ` (${p.chance_of_playing_next_round}% chance to play)` : '';
            injured.push(`• *${p.web_name}* (${teamName}) - ${posLabel} | ${getStatusLabel(currentStatus)}${chanceText}\n   _News: ${currentNews || 'No details provided.'}_`);
          }
        }
      }
    });

    // Save updated cache
    storageService.savePlayerCache(newCache);

    if (isFirstRun) {
      console.log('[Scheduler] First run: Initialized player cache successfully.');
      return;
    }

    // Prepare notifications
    let broadcastNeeded = false;
    let message = '';

    if (rises.length > 0 || falls.length > 0) {
      broadcastNeeded = true;
      message += `📈 *FPL DAILY PRICE CHANGES* 📉\n`;
      if (rises.length > 0) {
        message += `\n🔺 *Price Rises:*\n${rises.join('\n')}\n`;
      }
      if (falls.length > 0) {
        message += `\n🔻 *Price Falls:*\n${falls.join('\n')}\n`;
      }
    }

    if (injured.length > 0 || recovered.length > 0) {
      if (broadcastNeeded) message += `\n══════════════════\n\n`;
      broadcastNeeded = true;
      message += `🏥 *FPL INJURY & STATUS UPDATES* 🏥\n`;
      if (injured.length > 0) {
        message += `\n🔴 *New Injuries / Suspensions:*\n${injured.join('\n')}\n`;
      }
      if (recovered.length > 0) {
        message += `\n🟢 *Recovered / Available:*\n${recovered.join('\n')}\n`;
      }
    }

    if (broadcastNeeded) {
      console.log('[Scheduler] Changes detected. Broadcasting updates...');
      await broadcastMessage(client, message);
    } else {
      console.log('[Scheduler] No price or injury updates detected.');
    }

  } catch (err) {
    console.error('[Scheduler] Error checking price & injury updates:', err.message);
  }
}

function initScheduler(client) {
  console.log('[Scheduler] Initializing cron schedules...');

  // Check deadlines every hour: "0 * * * *"
  cron.schedule('0 * * * *', () => {
    console.log('[Scheduler] Checking deadlines...');
    checkDeadlines(client);
  });

  // Check price and injury changes every hour: "15 * * * *"
  // Having them offset slightly is a good practice to distribute load.
  cron.schedule('15 * * * *', () => {
    console.log('[Scheduler] Running hourly price/injury check...');
    checkPriceAndInjuries(client);
  });

  // Run initial checks on startup (delayed by 10s to let bot load)
  setTimeout(() => {
    console.log('[Scheduler] Running startup checks...');
    checkDeadlines(client);
    checkPriceAndInjuries(client);
  }, 10000);
}

module.exports = {
  initScheduler,
  // Exported for manual testing triggers
  checkDeadlines,
  checkPriceAndInjuries
};
