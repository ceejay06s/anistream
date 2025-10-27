/**
 * Test Script for Anime Heaven
 * Run with: node test-anime-heaven.js
 */

const { animesearch, animeinfo, animedl } = require('anime-heaven');

async function testAnimeHeaven() {
  console.log('\n🧪 Testing Anime Heaven Package\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Search
    console.log('\n📍 Test 1: Searching for "Naruto"...');
    const searchResults = await animesearch('Naruto');

    if (!searchResults || searchResults.length === 0) {
      console.log('❌ No results found');
      return;
    }

    console.log(`✅ Found ${searchResults.length} results`);
    console.log(`   First result: ${searchResults[0].title || searchResults[0].name}`);
    console.log(`   ID: ${searchResults[0].id || searchResults[0].slug}`);

    const firstAnime = searchResults[0];
    const animeId = firstAnime.id || firstAnime.slug || firstAnime.url;

    // Test 2: Get Anime Info
    console.log('\n📍 Test 2: Getting anime info...');
    const animeInfo = await animeinfo(animeId);

    if (!animeInfo) {
      console.log('❌ Could not get anime info');
      return;
    }

    console.log(`✅ Anime: ${animeInfo.title || animeInfo.name}`);
    console.log(`   Description: ${(animeInfo.description || animeInfo.synopsis || 'N/A').substring(0, 100)}...`);
    console.log(`   Episodes: ${animeInfo.episodes ? animeInfo.episodes.length : 'N/A'}`);

    if (!animeInfo.episodes || animeInfo.episodes.length === 0) {
      console.log('❌ No episodes found');
      return;
    }

    const firstEpisode = animeInfo.episodes[0];
    console.log(`   First episode: ${firstEpisode.title || 'Episode 1'}`);
    const episodeId = firstEpisode.id || firstEpisode.url || firstEpisode.slug;
    console.log(`   Episode ID: ${episodeId}`);

    // Test 3: Get Episode Sources
    console.log('\n📍 Test 3: Getting video sources...');
    const sources = await animedl(episodeId);

    if (!sources || (!sources.sources && !sources.streamingLinks)) {
      console.log('❌ No sources found');
      return;
    }

    const sourceArray = sources.sources || sources.streamingLinks || [];
    console.log(`✅ Found ${sourceArray.length} video source(s)`);

    sourceArray.forEach((source, index) => {
      const url = source.url || source.file || source.link || 'N/A';
      const quality = source.quality || source.label || 'default';
      const type = url.includes('.m3u8') ? 'M3U8' : 'MP4';
      console.log(`   ${index + 1}. ${quality} (${type}): ${url.substring(0, 60)}...`);
    });

    // Test 4: Skip popular (not available in this package)
    console.log('\n📍 Test 4: Popular anime not available in anime-heaven package');
    console.log('ℹ️  Skipping...');

    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('🎉 Anime Heaven is working correctly!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n⚠️  Make sure you have internet connection');
    console.log('⚠️  The anime-heaven package might need updating: npm install anime-heaven@latest\n');
  }
}

// Run the test
console.log('Starting Anime Heaven test...');
testAnimeHeaven();
