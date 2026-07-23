const fs = require('fs');
const path = require('path');
const config = require('../config');

const defaultDb = {
  subscribedChats: [],
  lastDeadlineAlerts: {}, // e.g. { "gw1": ["24h", "12h"] }
  playerCache: {}, // e.g. { "123": { price: 8.5, status: "a", news: "" } }
  dailyPriceCheckDate: "" // e.g. "2026-07-23"
};

function initDb() {
  const dir = path.dirname(config.dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(config.dbPath)) {
    fs.writeFileSync(config.dbPath, JSON.stringify(defaultDb, null, 2), 'utf8');
  }
}

function readDb() {
  initDb();
  try {
    const data = fs.readFileSync(config.dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON database, resetting to default:', err);
    return defaultDb;
  }
}

function writeDb(db) {
  initDb();
  try {
    fs.writeFileSync(config.dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to JSON database:', err);
  }
}

module.exports = {
  getSubscriptions() {
    const db = readDb();
    return db.subscribedChats || [];
  },

  addSubscription(chatId) {
    const db = readDb();
    if (!db.subscribedChats.includes(chatId)) {
      db.subscribedChats.push(chatId);
      writeDb(db);
      return true;
    }
    return false;
  },

  removeSubscription(chatId) {
    const db = readDb();
    const index = db.subscribedChats.indexOf(chatId);
    if (index !== -1) {
      db.subscribedChats.splice(index, 1);
      writeDb(db);
      return true;
    }
    return false;
  },

  isSubscribed(chatId) {
    const db = readDb();
    return db.subscribedChats.includes(chatId);
  },

  getLastDeadlineAlerts() {
    const db = readDb();
    return db.lastDeadlineAlerts || {};
  },

  saveDeadlineAlert(gameweekId, alertType) {
    const db = readDb();
    if (!db.lastDeadlineAlerts) db.lastDeadlineAlerts = {};
    if (!db.lastDeadlineAlerts[gameweekId]) {
      db.lastDeadlineAlerts[gameweekId] = [];
    }
    if (!db.lastDeadlineAlerts[gameweekId].includes(alertType)) {
      db.lastDeadlineAlerts[gameweekId].push(alertType);
      writeDb(db);
      return true;
    }
    return false;
  },

  getPlayerCache() {
    const db = readDb();
    return db.playerCache || {};
  },

  savePlayerCache(players) {
    const db = readDb();
    db.playerCache = players;
    writeDb(db);
  },

  getDailyPriceCheckDate() {
    const db = readDb();
    return db.dailyPriceCheckDate || "";
  },

  saveDailyPriceCheckDate(dateStr) {
    const db = readDb();
    db.dailyPriceCheckDate = dateStr;
    writeDb(db);
  }
};
