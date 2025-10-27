const { HiAnime } = require('aniwatch');

const hianime = new HiAnime.Scraper();

async function testFixedSources() {
  console.log('Testing Aniwatch with correct parameters...\n');

  try {
    // Search for anime first
    console.log('1. Searching for One Piece...');
    const searchResults = await hianime.search('One Piece');

    const mainSeries = searchResults.animes.find(a => a.id === 'one-piece-100');
    console.log(`✅ Found: ${mainSeries.name} (${mainSeries.id})`);

    // Get episodes
    console.log('\n2. Getting episodes...');
    const episodesData = await hianime.getEpisodes(mainSeries.id);
    console.log(`✅ Got ${episodesData.totalEpisodes} episodes`);

    const firstEpisode = episodesData.episodes[0];
    console.log(`   First episode: ${firstEpisode.title}`);
    console.log(`   Episode ID: ${firstEpisode.episodeId}`);

    // Get sources with correct parameters
    console.log('\n3. Getting video sources with CORRECT parameters...');
    console.log(`   Episode ID: ${firstEpisode.episodeId}`);
    console.log(`   Server: "hd-1"`);
    console.log(`   Category: "sub"`);

    const sources = await hianime.getEpisodeSources(
      firstEpisode.episodeId,
      'hd-1',  // Server parameter
      'sub'    // Category parameter
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

      console.log('\n🎉 Aniwatch video sources are NOW WORKING!');
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
    console.log('\n✅ All fixed! Aniwatch sources working with correct parameters.');
  } else {
    console.log('\n⚠️ Still having issues with Aniwatch sources.');
  }
  process.exit(success ? 0 : 1);
});
