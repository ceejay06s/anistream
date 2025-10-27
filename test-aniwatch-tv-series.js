const { HiAnime } = require('aniwatch');
const aniwatch = new HiAnime.Scraper();

async function testTVSeries() {
  console.log('═══════════════════════════════════════');
  console.log('  Testing Aniwatch with TV Series');
  console.log('═══════════════════════════════════════\n');

  try {
    // Test with the main One Piece TV series ID
    const animeId = 'one-piece-100';
    console.log(`1️⃣ Getting info for TV series: ${animeId}...`);

    const info = await aniwatch.getInfo(animeId);

    console.log(`✅ Anime: ${info.anime.info.name}`);
    console.log(`   Type: ${info.anime.info.stats.type}`);
    console.log(`   Episodes (Sub): ${info.anime.info.stats.episodes.sub}`);
    console.log(`   Episodes (Dub): ${info.anime.info.stats.episodes.dub}`);

    // Check for episodes
    if (info.episodes && info.episodes.length > 0) {
      console.log(`\n✅ Found ${info.episodes.length} episodes!`);
      console.log(`   First episode:`);
      console.log(`   - Number: ${info.episodes[0].number}`);
      console.log(`   - Title: ${info.episodes[0].title}`);
      console.log(`   - Episode ID: ${info.episodes[0].episodeId}`);

      // Test getting sources for first episode
      const episodeId = info.episodes[0].episodeId;
      console.log(`\n2️⃣ Getting video sources for episode: ${episodeId}...`);

      const sources = await aniwatch.getEpisodeSources(episodeId);

      if (sources && sources.sources && sources.sources.length > 0) {
        console.log(`✅ Found ${sources.sources.length} video source(s):`);
        sources.sources.forEach((source, index) => {
          const url = source.url || 'N/A';
          const quality = source.quality || 'default';
          const isM3U8 = url.includes('.m3u8');
          console.log(`   ${index + 1}. Quality: ${quality}, M3U8: ${isM3U8}`);
          console.log(`      URL: ${url.substring(0, 80)}...`);
        });

        if (sources.subtitles && sources.subtitles.length > 0) {
          console.log(`\n   📝 Subtitles: ${sources.subtitles.length} available`);
        }

        console.log('\n═══════════════════════════════════════');
        console.log('  ✅ ALL TESTS PASSED!');
        console.log('  Aniwatch is fully functional!');
        console.log('═══════════════════════════════════════\n');

        return true;
      } else {
        console.log('❌ No video sources found');
        return false;
      }
    } else {
      console.log('❌ No episodes found in the response');
      console.log('Response structure:', JSON.stringify(info, null, 2).substring(0, 500));
      return false;
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

testTVSeries().then(success => {
  if (success) {
    console.log('🎉 Aniwatch scraper is ready to use in the app!');
  } else {
    console.log('⚠️  Aniwatch scraper needs troubleshooting');
  }
  process.exit(success ? 0 : 1);
});
