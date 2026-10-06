# ⚽ WhatsApp FPL Assistant Bot

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![WhatsApp Web.js](https://img.shields.io/badge/whatsapp--web.js-v1.24+-25D366.svg)](https://github.com/pedroslopez/whatsapp-web.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-Headless-orange.svg)](https://pptr.dev/)

An automated, intelligent Fantasy Premier League (FPL) assistant bot built for WhatsApp groups and private chats. It combines automated deadline countdown broadcasts, real-time price change detection, injury telemetry, mini-league live tracking, and natural language command parsing in both English and Arabic.

---

## 🌟 Key Features

### 1. 🚨 Automated Broadcasts & Background Scheduling
* **Deadline Countdown Alerts**: Automated cascading notifications at **24h**, **12h**, **2h**, and **1h** prior to each gameweek deadline, bundled with the gameweek's fixture schedule.
* **Daily Price Fluctuation Monitoring**: Tracks midnight FPL player value fluctuations, calculating price rises ($\mathbf{+\pounds 0.1m}$) and drops with exact deltas.
* **Injury & Availability Telemetry**: Detects status updates (injuries, suspensions, fitness doubts) along with `chance_of_playing_next_round` percentages and recovery notifications (🟢 fit & available).

### 2. 💬 Bilingual Natural Language & Mention Support
Tag or mention the bot in your group chat to ask questions naturally in **English** or **Arabic**:
* *"@Bot who to captain?"*
* *"@Bot who did everyone captain?"*
* *"@Bot scout selection"* / *"@Bot تشكيلة الكشاف"*
* *"@Bot gameweek review"* / *"@Bot who won this week?"*
* *"@Bot what is the rank of sahl"*
* *"@Bot show fixtures for Chelsea"*
* *"@Bot search player Haaland"*

### 3. 🏆 Mini-League Analytics & Gameweek Review
* **Live Standings Table**: Fetches and renders your mini-league leaderboard with point margins and gameweek ranks.
* **League Captain Tracker**: Displays every league member's captain selection and active chips (Triple Captain, Bench Boost, Free Hit, Wildcard) once the deadline passes.
* **Gameweek Awards**: Automatically computes the **King of the GW** (top scorer), **Flop of the GW**, **Bench Sitter** (highest benched points), and **Captain Success Rate**.

### 4. 🧠 Smart Decision Tools & Scout Selection
* **Captain Recommendation Engine**: Evaluates top captain picks using form, fixture difficulty (FDR), expected goal involvement (xGI), and home/away splits.
* **Official FPL Scout Selection**: Pulls the official Scout picks for any specific gameweek.
* **Team Fixture Ticker**: Analyzes the upcoming 5 fixtures for any Premier League club with home/away difficulty indicators.

---

## 🛠️ Architecture

```
                       ┌────────────────────────┐
                       │   Official FPL API     │
                       └───────────┬────────────┘
                                   │ (Axios)
                                   ▼
┌──────────────────┐    ┌───────────────────────┐    ┌──────────────────┐
│  WhatsApp Group  │◄───┤    Bot Controller     ├───►│  Local Storage   │
│   (Users/Chat)   │    │  (whatsapp-web.js)    │    │ (data/db.json)   │
└────────┬─────────┘    └───────────▲───────────┘    └──────────────────┘
         │                          │
         │ Commands / Mentions      │ Scheduled Jobs
         ▼                          │ (Deadlines, Prices, Injuries)
┌──────────────────┐    ┌───────────┴───────────┐
│  Command Router  │    │  Scheduler (node-cron)│
│  (NLP & Prefix)  │    └───────────────────────┘
└──────────────────┘
```

---

## 📋 Command Reference

Prefix defaults to `!` (configurable via `.env`):

| Command | Usage | Description |
| :--- | :--- | :--- |
| `!help` | `!help` | Displays the help menu and supported natural language queries. |
| `!deadline` | `!deadline` | Displays the next gameweek deadline, countdown timer, and fixtures. |
| `!fixtures` | `!fixtures [team]` | Shows upcoming gameweek matches, or the next 5 fixtures for a club. |
| `!player` | `!player <name>` | Looks up player price, selected %, total points, form, and injury status. |
| `!captain` | `!captain` | Recommends top captain picks for the upcoming gameweek based on metrics. |
| `!captains` | `!captains` | Summarizes every mini-league manager's captain and chips played for current GW. |
| `!league` | `!league` | Formats and outputs the current mini-league standings table. |
| `!rank` | `!rank <name>` | Fetches live points, total points, and rank for a specific manager. |
| `!scouts` | `!scouts [gw]` | Displays the official FPL Scout Selection 11 and bench. |
| `!review` | `!review` | Generates gameweek awards (King, Flop, Bench Points, Captain choice). |
| `!chatid` | `!chatid` | Utility to retrieve the current chat/group ID for `.env` setup. |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v18.x` or higher
* **Google Chrome / Chromium**: Installed locally for Puppeteer headless browser emulation.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Almadih/fpl-assistant.git
   cd fpl-assistant
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your settings:
   ```env
   PREFIX=!
   CHROME_PATH=/usr/bin/google-chrome
   FPL_API_BASE=https://fantasy.premierleague.com/api
   LEAGUE_ID=629254
   TARGET_GROUP_ID=120363000000000000@g.us
   BOT_ID=
   ```

4. **Start the assistant bot**:
   ```bash
   npm start
   ```

5. **Authenticate with WhatsApp**:
   * A QR code will be displayed in your terminal.
   * Open WhatsApp on your phone $\rightarrow$ **Linked Devices** $\rightarrow$ **Link a Device**.
   * Scan the terminal QR code. Authentication state will be cached securely in `data/.wwebjs_auth/`.

---

## 📁 Project Structure

```
fpl-assistant/
├── data/
│   ├── .wwebjs_auth/         # Persistent WhatsApp authentication session
│   └── db.json               # Local state cache (price tracking, deadline alerts)
├── src/
│   ├── commands/             # Modular command handlers
│   │   ├── captain.js        # Captain recommendation algorithm
│   │   ├── captains.js       # League captain tracker
│   │   ├── deadline.js       # Deadline countdown calculation
│   │   ├── fixtures.js       # Fixture schedule & difficulty
│   │   ├── help.js           # Interactive help menu
│   │   ├── index.js          # Command router & NLP query parser
│   │   ├── league.js         # Mini-league standings handler
│   │   ├── player.js         # Player search & stat card
│   │   ├── review.js         # Gameweek retrospective & awards
│   │   └── scouts.js         # FPL Scout squad retriever
│   ├── services/
│   │   ├── fplService.js     # FPL API consumer & metric aggregation
│   │   ├── schedulerService.js# Cron tasks (deadlines, price & injury checks)
│   │   └── storageService.js # Local JSON persistence layer
│   ├── utils/
│   │   └── formatter.js      # Output string styling & countdown formatting
│   ├── bot.js                # WhatsApp client initialization & lifecycle
│   ├── config.js             # Environment configuration resolver
│   └── index.js              # Application entrypoint
├── .env.example              # Template configuration
├── package.json              # Project dependencies & scripts
└── README.md                 # Project documentation
```

---

## ⚙️ How It Works

* **Session Persistence**: Utilizes `whatsapp-web.js` with `LocalAuth` to eliminate the need to re-scan the QR code across restarts.
* **Smart Throttling**: The deadline scheduler automatically tracks previously emitted alerts (e.g. 24h vs 2h) in `db.json` so users are never spammed with duplicate notifications.
* **Diff Tracking**: Price changes and player injury statuses are stored in memory and synchronized against `data/db.json` to calculate state differences between daily sync runs.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
