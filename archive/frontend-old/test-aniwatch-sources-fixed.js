const { HiAnime } = require('aniwatch');

const hianime = new HiAnime.Scraper();

async function testFixedSources() {
  console.log('Testing Aniwatch getAnimeEpisodeSources()...\n');

  try {
    // Search for anime first
    console.log('1. Searching for One Piece...');
    const searchResults = await hianime.search('One Piece');

    const mainSeries = searchResults.animes.find(a => a.id === 'one-piece-100');
    if (!mainSeries) {
      console.error('❌ Could not find "One Piece" in search results.');
      return false;
    }
    console.log(`✅ Found: ${mainSeries.name} (${mainSeries.id})`);

    // Get episodes
    console.log('\n2. Getting episodes...');
    const episodesData = await hianime.getEpisodes(mainSeries.id);
    console.log(`✅ Got ${episodesData.totalEpisodes} episodes`);

    const firstEpisode = episodesData.episodes[0];
    console.log(`   First episode: ${firstEpisode.title}`);
    console.log(`   Episode ID: ${firstEpisode.episodeId}`);

    // Use getAnimeEpisodeSources instead of getEpisodeSources
    // getAnimeEpisodeSources is included in the aniwatch scraper
    console.log('\n3. Getting video sources using getAnimeEpisodeSources...');
    console.log(`   Episode ID: ${firstEpisode.episodeId}`);
    // Optional: you can provide options, such as { server: "hd-1", category: "sub" }
    // Many implementations allow both default and explicit parameters
    const sources = await hianime.getAnimeEpisodeSources(
      firstEpisode.episodeId,
      {
        server: "hd-1",  // preferred server (can omit for default behavior)
        category: "sub", // preferred language ("sub" or "dub")
      }
    );

    if (sources && sources.sources && sources.sources.length > 0) {
      console.log(`\n✅ SUCCESS! Found ${sources.sources.length} video sources:`);
      sources.sources.forEach((source, index) => {
        console.log(`   ${index + 1}. Quality: ${source.quality}`);
        console.log(`      URL: ${source.url.substring(0, 80)}...`);
        console.log(`      Type: ${source.url.includes('.m3u8') ? 'M3U8/HLS' : 'MP4'}`);
      });

      if (sources.subtitles && sources.subtitles.length > 0) {
        console.log(`\n   📝 Subtitles: ${sources.subtitles.length} available`);
      }

      console.log('\n🎉 Aniwatch video sources are NOW WORKING via getAnimeEpisodeSources!');
      return true;
    } else {
      console.log('❌ No sources found');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

testFixedSources().then(success => {
  if (success) {
    console.log('\n✅ All fixed! Aniwatch sources working with getAnimeEpisodeSources.');
  } else {
    console.log('\n⚠️ Still having issues with Aniwatch sources.');
  }
  process.exit(success ? 0 : 1);
});
