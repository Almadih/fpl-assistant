const axios = require('axios');
const config = require('../config');

// FPL API base URL
const FPL_BASE = config.fplApiBase;

// Cache booster static data locally in-memory for active commands to avoid hitting FPL API excessively on every command.
let bootstrapCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

async function getBootstrapData() {
  const now = Date.now();
  if (bootstrapCache && (now - lastFetchTime < CACHE_TTL)) {
    return bootstrapCache;
  }

  try {
    const url = `${FPL_BASE}/bootstrap-static/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    bootstrapCache = response.data;
    lastFetchTime = now;
    return bootstrapCache;
  } catch (error) {
    console.error('Error fetching FPL bootstrap data:', error.message);
    if (bootstrapCache) {
      console.log('Returning stale bootstrap cache...');
      return bootstrapCache;
    }
    throw error;
  }
}

async function getFixtures() {
  try {
    const url = `${FPL_BASE}/fixtures/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching FPL fixtures:', error.message);
    throw error;
  }
}

// Helpers for team and position mapping
const POSITION_MAP = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD'
};

async function getTeamsMap() {
  const data = await getBootstrapData();
  const map = {};
  data.teams.forEach(t => {
    map[t.id] = {
      name: t.name,
      short_name: t.short_name
    };
  });
  return map;
}

module.exports = {
  getBootstrapData,
  getFixtures,

  async getNextGameweek() {
    const data = await getBootstrapData();
    const now = new Date();
    // Sort by id to ensure order
    const gws = data.events.sort((a, b) => a.id - b.id);
    
    // Find first gameweek where is_next is true, or check deadline_time
    const nextGw = gws.find(gw => gw.is_next === true) || gws.find(gw => new Date(gw.deadline_time) > now);
    return nextGw;
  },

  async getGameweekById(gwId) {
    const data = await getBootstrapData();
    return data.events.find(gw => gw.id === parseInt(gwId));
  },

  async searchPlayer(queryName) {
    const data = await getBootstrapData();
    const teamsMap = await getTeamsMap();
    const query = queryName.toLowerCase().trim();

    if (!query) return [];

    // Filter players based on name match
    const matches = data.elements.filter(p => {
      const webName = p.web_name.toLowerCase();
      const fullName = `${p.first_name} ${p.second_name}`.toLowerCase();
      return webName.includes(query) || fullName.includes(query);
    });

    return matches.map(p => {
      const teamInfo = teamsMap[p.team] || { name: 'Unknown', short_name: 'UNK' };
      return {
        id: p.id,
        name: p.web_name,
        fullName: `${p.first_name} ${p.second_name}`,
        team: teamInfo.name,
        teamShort: teamInfo.short_name,
        position: POSITION_MAP[p.element_type] || 'UNK',
        price: (p.now_cost / 10).toFixed(1),
        status: p.status, // a, i, d, s, etc.
        news: p.news,
        chanceOfPlaying: p.chance_of_playing_next_round,
        totalPoints: p.total_points,
        eventPoints: p.event_points,
        goals: p.goals_scored,
        assists: p.assists,
        cleanSheets: p.clean_sheets,
        form: p.form,
        selectedByPercent: p.selected_by_percent
      };
    });
  },

  async getFixturesForGameweek(gwId) {
    const fixtures = await getFixtures();
    const teamsMap = await getTeamsMap();
    
    const gwFixtures = fixtures.filter(f => f.event === parseInt(gwId));
    
    return gwFixtures.map(f => {
      const homeTeam = teamsMap[f.team_h] || { name: 'Home Team', short_name: 'H' };
      const awayTeam = teamsMap[f.team_a] || { name: 'Away Team', short_name: 'A' };
      return {
        id: f.id,
        kickoff: new Date(f.kickoff_time),
        home: homeTeam.name,
        homeShort: homeTeam.short_name,
        away: awayTeam.name,
        awayShort: awayTeam.short_name,
        homeDifficulty: f.team_h_difficulty,
        awayDifficulty: f.team_a_difficulty,
        started: f.started,
        finished: f.finished,
        score: f.started ? `${f.team_h_score} - ${f.team_a_score}` : null
      };
    });
  },

  async getFixturesForTeam(teamQuery) {
    const data = await getBootstrapData();
    const teamsMap = await getTeamsMap();
    const query = teamQuery.toLowerCase().trim();
    
    // Find team id
    const team = data.teams.find(t => t.name.toLowerCase().includes(query) || t.short_name.toLowerCase() === query);
    if (!team) return null;

    const fixtures = await getFixtures();
    // Filter upcoming fixtures for this team
    const teamFixtures = fixtures.filter(f => (f.team_h === team.id || f.team_a === team.id) && !f.finished);
    
    // Sort by kickoff time and get next 5
    const upcoming = teamFixtures.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time)).slice(0, 5);

    return {
      teamName: team.name,
      teamShort: team.short_name,
      fixtures: upcoming.map(f => {
        const homeTeam = teamsMap[f.team_h] || { name: 'Home Team', short_name: 'H' };
        const awayTeam = teamsMap[f.team_a] || { name: 'Away Team', short_name: 'A' };
        return {
          gameweek: f.event,
          kickoff: new Date(f.kickoff_time),
          home: homeTeam.name,
          homeShort: homeTeam.short_name,
          away: awayTeam.name,
          awayShort: awayTeam.short_name,
          isHome: f.team_h === team.id,
          difficulty: f.team_h === team.id ? f.team_h_difficulty : f.team_a_difficulty
        };
      })
    };
  },

  async getTeamsList() {
    const data = await getBootstrapData();
    return data.teams.map(t => ({ id: t.id, name: t.name, short: t.short_name }));
  },

  async getLeagueStandings(leagueId = config.leagueId) {
    try {
      const url = `${FPL_BASE}/leagues-classic/${leagueId}/standings/`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return {
        league: response.data.league,
        standings: response.data.standings.results,
        hasNext: response.data.standings.has_next,
        page: response.data.standings.page
      };
    } catch (error) {
      console.error(`Error fetching league ${leagueId} standings:`, error.message);
      throw error;
    }
  },

  async searchLeaguePlayer(query, leagueId = config.leagueId) {
    const data = await this.getLeagueStandings(leagueId);
    if (!query || !query.trim()) {
      return { league: data.league, matches: [], totalEntries: data.standings.length, standings: data.standings };
    }

    const q = query.toLowerCase().trim();
    const matches = data.standings.filter(entry => {
      const playerName = (entry.player_name || '').toLowerCase();
      const entryName = (entry.entry_name || '').toLowerCase();
      return playerName.includes(q) || entryName.includes(q);
    });

    return {
      league: data.league,
      matches,
      totalEntries: data.standings.length,
      standings: data.standings
    };
  }
};

