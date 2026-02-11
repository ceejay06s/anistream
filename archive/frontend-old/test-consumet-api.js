const axios = require('axios');

const CONSUMET_API = 'https://api.consumet.org';

const ConsumetProvider = {
  GOGOANIME: 'gogoanime',
  ZORO: 'zoro',
  ANIMEPAHE: 'animepahe',
  NINEANIME: '9anime',
};

async function testSearch() {
  console.log('\n🔍 Testing Consumet API Search...\n');

  try {
    // Test GoGoAnime search
    console.log('1️⃣ Testing GoGoAnime search for "Naruto"...');
    const gogoResponse = await axios.get(
      `${CONSUMET_API}/anime/${ConsumetProvider.GOGOANIME}/naruto`,
      { timeout: 10000 }
    );

    if (gogoResponse.data && gogoResponse.data.results) {
      console.log(`✅ GoGoAnime: Found ${gogoResponse.data.results.length} results`);
      if (gogoResponse.data.results.length > 0) {
        const first = gogoResponse.data.results[0];
        console.log(`   First result: "${first.title}" (ID: ${first.id})`);
      }
    }
  } catch (error) {
    console.error(`❌ GoGoAnime search failed: ${error.message}`);
  }

  try {
    // Test Zoro search
    console.log('\n2️⃣ Testing Zoro search for "One Piece"...');
    const zoroResponse = await axios.get(
      `${CONSUMET_API}/anime/${ConsumetProvider.ZORO}/one piece`,
      { timeout: 10000 }
    );

    if (zoroResponse.data && zoroResponse.data.results) {
      console.log(`✅ Zoro: Found ${zoroResponse.data.results.length} results`);
      if (zoroResponse.data.results.length > 0) {
        const first = zoroResponse.data.results[0];
        console.log(`   First result: "${first.title}" (ID: ${first.id})`);
      }
    }
  } catch (error) {
    console.error(`❌ Zoro search failed: ${error.message}`);
  }
}

async function testAnimeInfo() {
  console.log('\n\n📺 Testing Anime Info...\n');

  try {
    // Test getting anime info from GoGoAnime
    console.log('3️⃣ Testing GoGoAnime anime info for "naruto"...');
    const infoResponse = await axios.get(
      `${CONSUMET_API}/anime/${ConsumetProvider.GOGOANIME}/info/naruto`,
      { timeout: 15000 }
    );

    if (infoResponse.data) {
      const anime = infoResponse.data;
      console.log(`✅ Got anime info: "${anime.title}"`);
      console.log(`   Episodes: ${anime.episodes ? anime.episodes.length : 0}`);

      if (anime.episodes && anime.episodes.length > 0) {
        const firstEp = anime.episodes[0];
        console.log(`   First episode ID: ${firstEp.id}`);
        return firstEp.id; // Return for next test
      }
    }
  } catch (error) {
    console.error(`❌ Anime info failed: ${error.message}`);
  }

  return null;
}

async function testEpisodeSources(episodeId) {
  console.log('\n\n🎬 Testing Episode Sources...\n');

  if (!episodeId) {
    console.log('⚠️ No episode ID available, skipping source test');
    return;
  }

  try {
    console.log(`4️⃣ Testing GoGoAnime episode sources for "${episodeId}"...`);
    const sourcesResponse = await axios.get(
      `${CONSUMET_API}/anime/${ConsumetProvider.GOGOANIME}/watch/${episodeId}`,
      { timeout: 15000 }
    );

    if (sourcesResponse.data && sourcesResponse.data.sources) {
      console.log(`✅ Found ${sourcesResponse.data.sources.length} video sources`);
      sourcesResponse.data.sources.forEach((source, index) => {
        console.log(`   ${index + 1}. Quality: ${source.quality || 'auto'}, M3U8: ${source.isM3U8 || false}`);
        console.log(`      URL: ${source.url.substring(0, 60)}...`);
      });

      if (sourcesResponse.data.subtitles && sourcesResponse.data.subtitles.length > 0) {
        console.log(`   📝 Subtitles: ${sourcesResponse.data.subtitles.length} available`);
      }
    }
  } catch (error) {
    console.error(`❌ Episode sources failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════');
  console.log('  Consumet HTTP API Test Suite');
  console.log('═══════════════════════════════════════');

  await testSearch();
  const episodeId = await testAnimeInfo();
  await testEpisodeSources(episodeId);

  console.log('\n═══════════════════════════════════════');
  console.log('  Tests Complete!');
  console.log('═══════════════════════════════════════\n');
}

runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
