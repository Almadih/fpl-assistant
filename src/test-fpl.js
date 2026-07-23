const fplService = require('./services/fplService');

async function test() {
  console.log("Fetching bootstrap static data...");
  const data = await fplService.getBootstrapData();
  console.log("Bootstrap static players count:", data.elements.length);

  console.log("\nFinding next gameweek...");
  const nextGw = await fplService.getNextGameweek();
  console.log("Next Gameweek:", nextGw ? `${nextGw.name} (Deadline: ${nextGw.deadline_time})` : "None");

  console.log("\nSearching for player 'Salah'...");
  const players = await fplService.searchPlayer("Salah");
  console.log("Matches found:", players.length);
  if (players.length > 0) {
    console.log(players[0]);
  }

  console.log("\nSearching for team fixtures 'Arsenal'...");
  const teamFixs = await fplService.getFixturesForTeam("Arsenal");
  console.log("Arsenal team info:", teamFixs ? `${teamFixs.teamName} (${teamFixs.teamShort})` : "Not found");
  if (teamFixs && teamFixs.fixtures.length > 0) {
    console.log("First fixture:", teamFixs.fixtures[0]);
  }
}

test().catch(err => console.error("Test failed:", err));
