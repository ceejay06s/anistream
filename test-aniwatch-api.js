/**
 * Quick Test Script for Official Aniwatch API
 * Run with: node test-aniwatch-api.js
 */

const { HiAnime } = require('aniwatch');
const aniwatch = new HiAnime.Scraper();

async function testAniwatchApi() {
  console.log('\n🧪 Testing Official Aniwatch NPM Package\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Search
    console.log('\n📍 Test 1: Searching for "Naruto"...');
    const searchResults = await aniwatch.search('Naruto');

    if (!searchResults || !searchResults.animes || searchResults.animes.length === 0) {
      console.log('❌ No results found');
      return;
    }

    console.log(`✅ Found ${searchResults.animes.length} results`);
    console.log(`   First result: ${searchResults.animes[0].name || searchResults.animes[0].title}`);
    console.log(`   ID: ${searchResults.animes[0].id}`);

    const firstAnime = searchResults.animes[0];

    // Test 2: Get Anime Info
    console.log('\n📍 Test 2: Getting anime info...');
    const animeInfo = await aniwatch.getInfo(firstAnime.id);

    if (!animeInfo) {
      console.log('❌ Could not get anime info');
      return;
    }

    console.log(`✅ Anime: ${animeInfo.name || animeInfo.title}`);
    console.log(`   Description: ${(animeInfo.description || 'N/A').substring(0, 100)}...`);
    console.log(`   Episodes: ${animeInfo.episodes ? animeInfo.episodes.length : 'N/A'}`);

    if (!animeInfo.episodes || animeInfo.episodes.length === 0) {
      console.log('❌ No episodes found');
      return;
    }

    const firstEpisode = animeInfo.episodes[0];
    console.log(`   First episode: ${firstEpisode.title || 'Episode 1'}`);
    console.log(`   Episode ID: ${firstEpisode.episodeId || firstEpisode.id}`);

    // Test 3: Get Episode Sources
    console.log('\n📍 Test 3: Getting video sources...');
    const episodeId = firstEpisode.episodeId || firstEpisode.id;
    const sources = await aniwatch.getEpisodeSources(episodeId);

    if (!sources || !sources.sources || sources.sources.length === 0) {
      console.log('❌ No sources found');
      return;
    }

    console.log(`✅ Found ${sources.sources.length} video source(s)`);
    sources.sources.forEach((source, index) => {
      const url = source.url || source.file || 'N/A';
      const quality = source.quality || source.label || 'default';
      const type = url.includes('.m3u8') ? 'M3U8' : 'MP4';
      console.log(`   ${index + 1}. ${quality} (${type}): ${url.substring(0, 60)}...`);
    });

    // Test 4: Get Episode Servers (if available)
    console.log('\n📍 Test 4: Getting available servers...');
    try {
      const servers = await aniwatch.getEpisodeServers(episodeId);
      if (servers && Array.isArray(servers)) {
        console.log(`✅ Found ${servers.length} server(s)`);
        servers.forEach((server, index) => {
          console.log(`   ${index + 1}. ${server.name || server.serverName || 'Server ' + (index + 1)}`);
        });
      } else {
        console.log('ℹ️  No additional servers available');
      }
    } catch (serverError) {
      console.log('ℹ️  Server fetch not available or failed');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('🎉 Official Aniwatch API is working correctly!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n⚠️  Make sure you have internet connection');
    console.log('⚠️  The aniwatch package might need updating: npm install aniwatch@latest\n');
  }
}

// Run the test
console.log('Starting Aniwatch API test...');
testAniwatchApi();
