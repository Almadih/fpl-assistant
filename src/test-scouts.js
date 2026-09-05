const fplService = require('./services/fplService');
const scoutsCommand = require('./commands/scouts');

async function runTests() {
  console.log('=== TEST 1: Default getScoutSelection() ===');
  const latestScout = await fplService.getScoutSelection();
  if (!latestScout) {
    throw new Error('Expected scout selection data, received null');
  }
  console.log('Title:', latestScout.title);
  console.log('Gameweek:', latestScout.gameweek);
  console.log('Captain:', latestScout.captain);
  console.log('Vice-Captain:', latestScout.viceCaptain);
  console.log('Graphic Image URL:', latestScout.graphicImageUrl);
  console.log('Starting XI count:', latestScout.allPlayers.length);
  console.log('GKP count:', latestScout.squad.gkp.length);
  console.log('DEF count:', latestScout.squad.def.length);
  console.log('MID count:', latestScout.squad.mid.length);
  console.log('FWD count:', latestScout.squad.fwd.length);

  if (latestScout.allPlayers.length !== 11) {
    throw new Error(`Expected 11 players in scout squad, found ${latestScout.allPlayers.length}`);
  }

  console.log('\n=== TEST 2: Specific GW getScoutSelection(2) ===');
  const gw2Scout = await fplService.getScoutSelection(2);
  console.log('Title:', gw2Scout.title);
  console.log('Gameweek:', gw2Scout.gameweek);
  console.log('Captain:', gw2Scout.captain);
  console.log('Vice-Captain:', gw2Scout.viceCaptain);
  console.log('Total players:', gw2Scout.allPlayers.length);

  console.log('\n=== TEST 3: Future GW getScoutSelection(15) ===');
  const futureScout = await fplService.getScoutSelection(15);
  console.log('NotFound flag:', futureScout.notFound);
  console.log('Requested GW:', futureScout.requestedGw);
  console.log('Latest available GW:', futureScout.latestAvailableGw);

  console.log('\n=== TEST 4: scouts.js execute() with Mock Client ===');
  let repliedText = '';
  let sentMedia = null;
  let sentCaption = '';

  const mockMessage = {
    from: '123456789@c.us',
    reply: async (text) => {
      repliedText = text;
      console.log('[Mock Reply Sent]:\n' + text);
    }
  };

  const mockClient = {
    sendMessage: async (chatId, media, options) => {
      sentMedia = media;
      sentCaption = options.caption;
      console.log(`[Mock Media Sent to ${chatId}]: Media length: ${media.data ? media.data.length : 'N/A'}\nCaption:\n${options.caption}`);
    }
  };

  await scoutsCommand.execute(mockClient, mockMessage, ['2']);

  console.log('\n✅ ALL SCOUTS TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
