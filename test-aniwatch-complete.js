const { HiAnime } = require('aniwatch');
const aniwatch = new HiAnime.Scraper();

async function testComplete() {
  console.log('═══════════════════════════════════════');
  console.log('  Complete Aniwatch API Test');
  console.log('═══════════════════════════════════════\n');

  try {
    // Step 1: Search
    console.log('1️⃣ Searching for "One Piece"...');
    const searchResults = await aniwatch.search('One Piece');

    if (!searchResults || !searchResults.animes || searchResults.animes.length === 0) {
      console.log('❌ No search results');
      return false;
    }

    // Find the TV series
    const tvSeries = searchResults.animes.find(a => a.id === 'one-piece-100') || searchResults.animes[1];
    console.log(`✅ Found: ${tvSeries.name} (${tvSeries.id})`);
    console.log(`   Type: ${tvSeries.type}`);
    console.log(`   Episodes: ${tvSeries.episodes.sub} sub, ${tvSeries.episodes.dub} dub`);

    // Step 2: Get anime info
    console.log(`\n2️⃣ Getting anime details...`);
    const animeInfo = await aniwatch.getInfo(tvSeries.id);

    console.log(`✅ Title: ${animeInfo.anime.info.name}`);
    console.log(`   Rating: ${animeInfo.anime.info.stats.rating}`);
    console.log(`   Description: ${animeInfo.anime.info.description.substring(0, 100)}...`);

    // Step 3: Get episodes (IMPORTANT: separate method!)
    console.log(`\n3️⃣ Getting episodes list...`);
    const episodesData = await aniwatch.getEpisodes(tvSeries.id);

    if (!episodesData || !episodesData.episodes || episodesData.episodes.length === 0) {
      console.log('❌ No episodes found');
      return false;
    }

    console.log(`✅ Found ${episodesData.totalEpisodes} total episodes`);
    console.log(`   Loaded: ${episodesData.episodes.length} episodes`);
    console.log(`   First episode:`);
    console.log(`   - #${episodesData.episodes[0].number}: ${episodesData.episodes[0].title}`);
    console.log(`   - Episode ID: ${episodesData.episodes[0].episodeId}`);
    console.log(`   - Filler: ${episodesData.episodes[0].isFiller}`);

    // Step 4: Get video sources
    const testEpisode = episodesData.episodes[0];
    console.log(`\n4️⃣ Getting video sources for episode ${testEpisode.number}...`);
    const sources = await aniwatch.getEpisodeSources(testEpisode.episodeId);

    if (!sources || !sources.sources || sources.sources.length === 0) {
      console.log('❌ No video sources found');
      return false;
    }

    console.log(`✅ Found ${sources.sources.length} video source(s):`);
    sources.sources.forEach((source, index) => {
      const url = source.url || 'N/A';
      const quality = source.quality || 'default';
      const isM3U8 = url.includes('.m3u8');
      console.log(`   ${index + 1}. Quality: ${quality}, Format: ${isM3U8 ? 'M3U8/HLS' : 'MP4'}`);
      console.log(`      URL: ${url.substring(0, 70)}...`);
    });

    if (sources.subtitles && sources.subtitles.length > 0) {
      console.log(`\n   📝 Subtitles: ${sources.subtitles.length} available`);
      console.log(`      Languages: ${sources.subtitles.map(s => s.lang).join(', ')}`);
    }

    if (sources.download) {
      console.log(`   💾 Download link available`);
    }

    // Step 5: Get episode servers (alternative sources)
    console.log(`\n5️⃣ Getting available servers...`);
    try {
      const servers = await aniwatch.getEpisodeServers(testEpisode.episodeId);
      if (servers && servers.sub && servers.sub.length > 0) {
        console.log(`✅ Sub servers: ${servers.sub.map(s => s.serverName).join(', ')}`);
      }
      if (servers && servers.dub && servers.dub.length > 0) {
        console.log(`✅ Dub servers: ${servers.dub.map(s => s.serverName).join(', ')}`);
      }
    } catch (e) {
      console.log('ℹ️  Servers not available');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('  ✅ ALL TESTS PASSED!');
    console.log('  🎉 Aniwatch is fully functional!');
    console.log('═══════════════════════════════════════\n');

    return true;

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    return false;
  }
}

testComplete().then(success => {
  if (success) {
    console.log('✅ Aniwatch scraper is ready to integrate into the app!');
    console.log('\n📝 Usage Summary:');
    console.log('   1. aniwatch.search(query) - Search for anime');
    console.log('   2. aniwatch.getInfo(animeId) - Get anime details');
    console.log('   3. aniwatch.getEpisodes(animeId) - Get episode list');
    console.log('   4. aniwatch.getEpisodeSources(episodeId) - Get video URLs');
    console.log('   5. aniwatch.getEpisodeServers(episodeId) - Get alternative servers\n');
  }
  process.exit(success ? 0 : 1);
});
