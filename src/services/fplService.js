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
  },

  async getCurrentOrLatestGameweek() {
    const data = await getBootstrapData();
    const current = data.events.find(e => e.is_current);
    if (current) return current;
    const previous = data.events.find(e => e.is_previous);
    if (previous) return previous;
    return data.events[0];
  },

  async getLeagueGameweekPicks(gwId = null, leagueId = config.leagueId) {
    const bootstrap = await getBootstrapData();
    const teamsMap = await getTeamsMap();

    let targetGwId = gwId;
    if (!targetGwId) {
      const activeGw = await this.getCurrentOrLatestGameweek();
      targetGwId = activeGw.id;
    } else {
      targetGwId = parseInt(targetGwId);
    }

    const gwEvent = bootstrap.events.find(e => e.id === targetGwId) || { name: `Gameweek ${targetGwId}`, id: targetGwId };
    const elementsMap = {};
    bootstrap.elements.forEach(p => {
      elementsMap[p.id] = {
        id: p.id,
        name: p.web_name,
        fullName: `${p.first_name} ${p.second_name}`,
        teamShort: (teamsMap[p.team] && teamsMap[p.team].short_name) || 'UNK',
        eventPoints: p.event_points || 0
      };
    });

    const { league, standings } = await this.getLeagueStandings(leagueId);

    // Fetch picks for all managers in parallel
    const pickPromises = standings.map(entry => {
      const url = `${FPL_BASE}/entry/${entry.entry}/event/${targetGwId}/picks/`;
      return axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      })
      .then(res => ({
        entry,
        picksData: res.data,
        error: null
      }))
      .catch(err => ({
        entry,
        picksData: null,
        error: err.message
      }));
    });

    const managersResults = await Promise.all(pickPromises);

    const captainsMap = {};
    const viceCaptainsMap = {};
    const chipsMap = {
      '3xc': [],
      'bboost': [],
      'wildcard': [],
      'freehit': []
    };

    const managersSummary = [];

    managersResults.forEach(({ entry, picksData, error }) => {
      if (error || !picksData || !picksData.picks) {
        return;
      }

      const activeChip = picksData.active_chip;
      if (activeChip && chipsMap[activeChip]) {
        chipsMap[activeChip].push({
          managerName: entry.player_name,
          teamName: entry.entry_name,
          entry: entry.entry
        });
      }

      const captainPick = picksData.picks.find(p => p.is_captain);
      const viceCaptainPick = picksData.picks.find(p => p.is_vice_captain);

      const capPlayer = captainPick ? elementsMap[captainPick.element] : null;
      const vcPlayer = viceCaptainPick ? elementsMap[viceCaptainPick.element] : null;

      if (capPlayer) {
        if (!captainsMap[capPlayer.id]) {
          captainsMap[capPlayer.id] = {
            player: capPlayer,
            count: 0,
            managers: [],
            isTripleCount: 0
          };
        }
        captainsMap[capPlayer.id].count += 1;
        const isTC = captainPick.multiplier === 3 || activeChip === '3xc';
        if (isTC) captainsMap[capPlayer.id].isTripleCount += 1;

        captainsMap[capPlayer.id].managers.push({
          name: entry.player_name,
          team: entry.entry_name,
          isTC
        });
      }

      if (vcPlayer) {
        if (!viceCaptainsMap[vcPlayer.id]) {
          viceCaptainsMap[vcPlayer.id] = {
            player: vcPlayer,
            count: 0,
            managers: []
          };
        }
        viceCaptainsMap[vcPlayer.id].count += 1;
        viceCaptainsMap[vcPlayer.id].managers.push({
          name: entry.player_name,
          team: entry.entry_name
        });
      }

      managersSummary.push({
        entry,
        picksData,
        captain: capPlayer,
        viceCaptain: vcPlayer,
        isTC: captainPick ? (captainPick.multiplier === 3 || activeChip === '3xc') : false,
        activeChip,
        history: picksData.entry_history || {}
      });
    });

    const sortedCaptains = Object.values(captainsMap).sort((a, b) => b.count - a.count);
    const sortedViceCaptains = Object.values(viceCaptainsMap).sort((a, b) => b.count - a.count);

    return {
      league,
      gameweek: gwEvent,
      totalManagers: standings.length,
      analyzedManagers: managersSummary.length,
      captains: sortedCaptains,
      viceCaptains: sortedViceCaptains,
      chips: chipsMap,
      managersSummary
    };
  },

  async getCaptainRecommendations(gwId = null) {
    const bootstrap = await getBootstrapData();
    const teamsMap = await getTeamsMap();
    const fixtures = await getFixtures();

    let targetGwId = gwId;
    if (!targetGwId) {
      const nextGw = await this.getNextGameweek();
      targetGwId = nextGw ? nextGw.id : 1;
    } else {
      targetGwId = parseInt(targetGwId);
    }

    const gwEvent = bootstrap.events.find(e => e.id === targetGwId) || { name: `Gameweek ${targetGwId}`, id: targetGwId };
    const gwFixtures = fixtures.filter(f => f.event === targetGwId);

    // Map each team to their fixture in targetGwId
    const teamFixtures = {};
    gwFixtures.forEach(f => {
      const homeTeam = teamsMap[f.team_h] || { name: 'Home Team', short_name: 'H' };
      const awayTeam = teamsMap[f.team_a] || { name: 'Away Team', short_name: 'A' };

      teamFixtures[f.team_h] = {
        opponent: awayTeam.short_name,
        opponentName: awayTeam.name,
        isHome: true,
        difficulty: f.team_h_difficulty
      };

      teamFixtures[f.team_a] = {
        opponent: homeTeam.short_name,
        opponentName: homeTeam.name,
        isHome: false,
        difficulty: f.team_a_difficulty
      };
    });

    // Score eligible players for captaincy (Midfielders & Forwards, plus elite defenders)
    const eligiblePlayers = bootstrap.elements.filter(p => {
      if (p.status === 'i' || p.status === 's' || p.status === 'n') return false;
      if (p.chance_of_playing_next_round !== null && p.chance_of_playing_next_round < 75) return false;
      return p.element_type === 3 || p.element_type === 4 || (p.element_type === 2 && parseFloat(p.form) >= 7.0);
    });

    const scoredPlayers = eligiblePlayers.map(p => {
      const teamInfo = teamsMap[p.team] || { name: 'Unknown', short_name: 'UNK' };
      const fixture = teamFixtures[p.team];
      
      const formVal = parseFloat(p.form) || 0;
      const price = p.now_cost / 10;
      const selectedBy = parseFloat(p.selected_by_percent) || 0;

      let captainScore = (price * 1.5) + (formVal * 2.0) + (Math.log(selectedBy + 1) * 2.5);

      if (fixture) {
        // FDR modifier
        if (fixture.difficulty === 2) captainScore += 3.5;
        else if (fixture.difficulty === 3) captainScore += 1.0;
        else if (fixture.difficulty >= 4) captainScore -= (fixture.difficulty - 2) * 2.0;

        // Home modifier
        if (fixture.isHome) captainScore += 2.0;
      } else {
        // Blank gameweek for this team
        captainScore -= 50;
      }

      return {
        id: p.id,
        name: p.web_name,
        fullName: `${p.first_name} ${p.second_name}`,
        team: teamInfo.name,
        teamShort: teamInfo.short_name,
        position: POSITION_MAP[p.element_type] || 'UNK',
        price: price.toFixed(1),
        form: p.form,
        totalPoints: p.total_points,
        selectedByPercent: p.selected_by_percent,
        fixture: fixture ? `${fixture.opponent} (${fixture.isHome ? 'H' : 'A'})` : 'Blank',
        fdr: fixture ? fixture.difficulty : 5,
        isHome: fixture ? fixture.isHome : false,
        captainScore: Math.round(captainScore * 10) / 10
      };
    }).filter(p => p.captainScore > 0);

    scoredPlayers.sort((a, b) => b.captainScore - a.captainScore);

    const topPicks = scoredPlayers.slice(0, 4);

    // Differential pick: highest score among players selected by < 10% and price >= 6.0
    const differentialCandidates = scoredPlayers.filter(p => parseFloat(p.selectedByPercent) < 10.0 && parseFloat(p.price) >= 6.0 && p.fdr <= 3);
    const differential = differentialCandidates.length > 0 ? differentialCandidates[0] : (scoredPlayers.find(p => parseFloat(p.selectedByPercent) < 15.0) || null);

    return {
      gameweek: gwEvent,
      topPicks,
      differential
    };
  },

  async getGameweekReview(gwId = null, leagueId = config.leagueId) {
    const data = await this.getLeagueGameweekPicks(gwId, leagueId);
    const { league, gameweek, managersSummary, totalManagers } = data;

    if (managersSummary.length === 0) {
      return { league, gameweek, empty: true };
    }

    // Calculate king of the week (highest GW points)
    const sortedByPoints = [...managersSummary].sort((a, b) => {
      const ptsA = a.history.points !== undefined ? a.history.points : a.entry.event_total;
      const ptsB = b.history.points !== undefined ? b.history.points : b.entry.event_total;
      return ptsB - ptsA;
    });

    const king = sortedByPoints[0];
    const flop = sortedByPoints[sortedByPoints.length - 1];

    // Bench warmer (most points on bench)
    const sortedByBench = [...managersSummary].sort((a, b) => (b.history.points_on_bench || 0) - (a.history.points_on_bench || 0));
    const benchWarmer = sortedByBench[0];

    // Hit master (most transfer cost)
    const sortedByHits = [...managersSummary].sort((a, b) => (b.history.event_transfers_cost || 0) - (a.history.event_transfers_cost || 0));
    const hitMaster = sortedByHits[0] && sortedByHits[0].history.event_transfers_cost > 0 ? sortedByHits[0] : null;

    // Best captain (captain who scored the highest points)
    const sortedByCaptainScore = [...managersSummary].filter(m => m.captain).sort((a, b) => {
      const ptsA = (a.captain.eventPoints || 0) * (a.isTC ? 3 : 2);
      const ptsB = (b.captain.eventPoints || 0) * (b.isTC ? 3 : 2);
      return ptsB - ptsA;
    });
    const bestCaptain = sortedByCaptainScore.length > 0 ? sortedByCaptainScore[0] : null;

    // Biggest Climber & Faller
    const managersWithMove = managersSummary.filter(m => m.entry.last_rank && m.entry.last_rank > 0).map(m => ({
      ...m,
      diff: m.entry.last_rank - m.entry.rank // positive = climbed, negative = fell
    }));

    let biggestClimber = null;
    let biggestFaller = null;

    if (managersWithMove.length > 0) {
      managersWithMove.sort((a, b) => b.diff - a.diff);
      if (managersWithMove[0].diff > 0) biggestClimber = managersWithMove[0];
      const last = managersWithMove[managersWithMove.length - 1];
      if (last.diff < 0) biggestFaller = last;
    }

    // Averages
    const totalGwPoints = managersSummary.reduce((sum, m) => sum + (m.history.points !== undefined ? m.history.points : m.entry.event_total), 0);
    const avgGwPoints = (totalGwPoints / managersSummary.length).toFixed(1);

    return {
      league,
      gameweek,
      totalManagers,
      analyzedManagers: managersSummary.length,
      king: {
        manager: king.entry.player_name,
        team: king.entry.entry_name,
        points: king.history.points !== undefined ? king.history.points : king.entry.event_total,
        rank: king.entry.rank
      },
      flop: {
        manager: flop.entry.player_name,
        team: flop.entry.entry_name,
        points: flop.history.points !== undefined ? flop.history.points : flop.entry.event_total,
        rank: flop.entry.rank
      },
      benchWarmer: benchWarmer && (benchWarmer.history.points_on_bench || 0) > 0 ? {
        manager: benchWarmer.entry.player_name,
        team: benchWarmer.entry.entry_name,
        benchPoints: benchWarmer.history.points_on_bench
      } : null,
      hitMaster: hitMaster ? {
        manager: hitMaster.entry.player_name,
        team: hitMaster.entry.entry_name,
        transfers: hitMaster.history.event_transfers || 0,
        cost: hitMaster.history.event_transfers_cost
      } : null,
      bestCaptain: bestCaptain ? {
        manager: bestCaptain.entry.player_name,
        captainName: bestCaptain.captain.name,
        captainPoints: (bestCaptain.captain.eventPoints || 0) * (bestCaptain.isTC ? 3 : 2),
        isTC: bestCaptain.isTC
      } : null,
      biggestClimber: biggestClimber ? {
        manager: biggestClimber.entry.player_name,
        team: biggestClimber.entry.entry_name,
        climbed: biggestClimber.diff,
        newRank: biggestClimber.entry.rank
      } : null,
      biggestFaller: biggestFaller ? {
        manager: biggestFaller.entry.player_name,
        team: biggestFaller.entry.entry_name,
        dropped: Math.abs(biggestFaller.diff),
        newRank: biggestFaller.entry.rank
      } : null,
      avgGwPoints
    };
  },

  async getScoutSelection(gwId = null) {
    const bootstrap = await getBootstrapData();
    const teamsMap = await getTeamsMap();

    let targetGw = gwId !== null ? parseInt(gwId) : null;
    let isExplicitGw = gwId !== null;

    if (!targetGw) {
      const nextGw = await this.getNextGameweek();
      if (nextGw) {
        targetGw = nextGw.id;
      } else {
        const cur = await this.getCurrentOrLatestGameweek();
        targetGw = cur ? cur.id : 1;
      }
    }

    // Fetch Scout articles list from Premier League API
    const listUrl = 'https://footballapi.pulselive.com/content/PremierLeague/text/en?pageSize=50&tagNames=content-creator:The-Scout';
    const response = await axios.get(listUrl, {
      headers: {
        'Origin': 'https://www.premierleague.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const scoutArticles = (response.data.content || []).filter(a =>
      a.title && a.title.toLowerCase().includes('scout selection')
    );

    if (scoutArticles.length === 0) {
      return null;
    }

    // Attach parsed gameweek number to each article
    const parsedArticles = scoutArticles.map(a => {
      const gwMatch = a.title.match(/(?:gameweek|gw)\s*(\d+)/i) ||
                      (a.titleUrlSegment && a.titleUrlSegment.match(/(?:gameweek|gw)-?(\d+)/i));
      return {
        ...a,
        parsedGw: gwMatch ? parseInt(gwMatch[1]) : null
      };
    });

    let selectedArticle = null;
    let isRequestedGwMatch = false;

    if (targetGw) {
      selectedArticle = parsedArticles.find(a => a.parsedGw === targetGw);
      if (selectedArticle) {
        isRequestedGwMatch = true;
      }
    }

    // If user explicitly asked for a GW that doesn't exist yet
    if (!selectedArticle && isExplicitGw) {
      const latestAvailable = parsedArticles.find(a => a.parsedGw !== null);
      return {
        notFound: true,
        requestedGw: targetGw,
        latestAvailableGw: latestAvailable ? latestAvailable.parsedGw : null
      };
    }

    // If not explicit and targetGw (next GW) is not yet published, fallback to latest published
    if (!selectedArticle) {
      selectedArticle = parsedArticles[0];
      isRequestedGwMatch = false;
    }

    // Fetch full article detail
    const detailUrl = `https://footballapi.pulselive.com/content/PremierLeague/text/en/${selectedArticle.id}`;
    const detailRes = await axios.get(detailUrl, {
      headers: {
        'Origin': 'https://www.premierleague.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const articleData = detailRes.data;
    const html = articleData.body || '';

    // Extract players from <h5>
    const playerRegex = /<h5>\s*([^<]+?)\s*\(([^)]+)\)\s*£?([\d\.]+)m?\s*<\/h5>(?:[\s\S]*?<p>([\s\S]*?)<\/p>)?/gi;
    let pMatch;
    const rawPlayers = [];
    while ((pMatch = playerRegex.exec(html)) !== null) {
      rawPlayers.push({
        name: pMatch[1].trim(),
        club: pMatch[2].trim(),
        cost: pMatch[3].trim(),
        rationale: pMatch[4] ? pMatch[4].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim() : ''
      });
    }

    // Extract Captain & Vice-Captain
    const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    let captain = null;
    let viceCaptain = null;

    const sentences = cleanText.split(/(?<=[.?!])\s+/);
    const armbandSentence = sentences.find(s => /armband/i.test(s));

    if (armbandSentence) {
      const capPart = armbandSentence.split(/armband/i)[0];
      for (const p of rawPlayers) {
        const lastName = p.name.split(' ').pop();
        if (capPart.includes(p.name) || capPart.includes(lastName)) {
          captain = p.name;
        }
      }

      const vcPart = armbandSentence.split(/vice-captain/i)[0];
      if (vcPart) {
        for (const p of rawPlayers) {
          if (p.name === captain) continue;
          const lastName = p.name.split(' ').pop();
          if (vcPart.includes(p.name) || vcPart.includes(lastName)) {
            viceCaptain = p.name;
          }
        }
      }
    }

    // Extract Official Graphic Image URL
    let graphicImageUrl = null;
    const mediaIdMatch = html.match(/data-media-id="(\d+)"/i);
    if (mediaIdMatch) {
      try {
        const photoRes = await axios.get(`https://footballapi.pulselive.com/content/PremierLeague/photo/en/${mediaIdMatch[1]}`, {
          headers: {
            'Origin': 'https://www.premierleague.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (photoRes.data && photoRes.data.imageUrl) {
          graphicImageUrl = photoRes.data.imageUrl;
        }
      } catch (e) {
        // Fall back below
      }
    }
    if (!graphicImageUrl && articleData.leadMedia && articleData.leadMedia.imageUrl) {
      graphicImageUrl = articleData.leadMedia.imageUrl;
    }

    function cleanStr(s) {
      if (!s) return '';
      return s.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ø/g, 'o')
        .replace(/Ø/g, 'O')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Cross-reference with bootstrap elements to get position & enriched info
    const enrichedPlayers = rawPlayers.map(rp => {
      const cleanName = cleanStr(rp.name);
      const cleanClub = cleanStr(rp.club);
      const nameTokens = cleanName.split(' ');

      // Prioritize players belonging to the same club
      const teamCandidates = bootstrap.elements.filter(el => {
        const t = teamsMap[el.team];
        if (!t) return false;
        const tName = cleanStr(t.name);
        const tShort = cleanStr(t.short_name);
        return tName.includes(cleanClub) || cleanClub.includes(tName) || tShort.includes(cleanClub) || cleanClub.includes(tShort);
      });

      const searchPool = teamCandidates.length > 0 ? teamCandidates : bootstrap.elements;

      let matchedElement = searchPool.find(el => {
        const elCleanFull = cleanStr(`${el.first_name} ${el.second_name}`);
        return nameTokens.every(tok => elCleanFull.includes(tok));
      });

      if (!matchedElement) {
        matchedElement = searchPool.find(el => {
          const elCleanWeb = cleanStr(el.web_name);
          return nameTokens.some(tok => elCleanWeb.includes(tok));
        });
      }

      if (!matchedElement && searchPool !== bootstrap.elements) {
        matchedElement = bootstrap.elements.find(el => {
          const elCleanFull = cleanStr(`${el.first_name} ${el.second_name}`);
          return nameTokens.every(tok => elCleanFull.includes(tok));
        });
      }

      const teamInfo = matchedElement && teamsMap[matchedElement.team]
        ? teamsMap[matchedElement.team]
        : { name: rp.club, short_name: rp.club };

      const isCap = captain && (
        cleanStr(rp.name).includes(cleanStr(captain)) ||
        cleanStr(captain).includes(cleanStr(rp.name)) ||
        (matchedElement && cleanStr(matchedElement.web_name) === cleanStr(captain))
      );
      const isVc = viceCaptain && (
        cleanStr(rp.name).includes(cleanStr(viceCaptain)) ||
        cleanStr(viceCaptain).includes(cleanStr(rp.name)) ||
        (matchedElement && cleanStr(matchedElement.web_name) === cleanStr(viceCaptain))
      );

      return {
        rawName: rp.name,
        webName: matchedElement ? matchedElement.web_name : rp.name,
        fullName: matchedElement ? `${matchedElement.first_name} ${matchedElement.second_name}` : rp.name,
        club: teamInfo.name,
        clubShort: teamInfo.short_name,
        elementType: matchedElement ? matchedElement.element_type : 3,
        position: POSITION_MAP[matchedElement ? matchedElement.element_type : 3] || 'MID',
        price: matchedElement ? (matchedElement.now_cost / 10).toFixed(1) : rp.cost,
        form: matchedElement ? matchedElement.form : '0.0',
        totalPoints: matchedElement ? matchedElement.total_points : 0,
        isCaptain: !!isCap,
        isViceCaptain: !!isVc,
        rationale: rp.rationale
      };
    });

    const squadByPosition = {
      gkp: enrichedPlayers.filter(p => p.elementType === 1),
      def: enrichedPlayers.filter(p => p.elementType === 2),
      mid: enrichedPlayers.filter(p => p.elementType === 3),
      fwd: enrichedPlayers.filter(p => p.elementType === 4)
    };

    const detectedGw = selectedArticle.parsedGw || targetGw;

    return {
      notFound: false,
      articleId: selectedArticle.id,
      title: selectedArticle.title,
      summary: articleData.summary || '',
      gameweek: detectedGw,
      requestedGw: targetGw,
      isRequestedGwMatch,
      captain: captain || (enrichedPlayers.find(p => p.isCaptain) ? enrichedPlayers.find(p => p.isCaptain).webName : null),
      viceCaptain: viceCaptain || (enrichedPlayers.find(p => p.isViceCaptain) ? enrichedPlayers.find(p => p.isViceCaptain).webName : null),
      graphicImageUrl,
      squad: squadByPosition,
      allPlayers: enrichedPlayers,
      articleUrl: `https://www.premierleague.com/en/news/${selectedArticle.id}`
    };
  }
};


