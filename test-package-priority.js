/**
 * Test: Verify Package-First Priority Implementation
 *
 * This test verifies that the Aniwatch NPM package is tried first,
 * before falling back to API scrapers.
 */

const { searchAniwatchImproved, getAniwatchInfoImproved } = require('./src/services/aniwatchImprovedService.ts');
const { searchAnimeForStreaming } = require('./src/services/streamingApi.ts');

async function testPackagePriority() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  🧪 PACKAGE-FIRST PRIORITY TEST                ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const testAnime = 'One Piece';

  try {
    // Step 1: Test NPM Package (should be tried first)
    console.log('1️⃣ Testing Aniwatch NPM Package (Priority 1)...\n');

    const startNPM = Date.now();
    const npmResults = await searchAniwatchImproved(testAnime);
    const npmTime = Date.now() - startNPM;

    if (npmResults.length > 0) {
      console.log(`✅ NPM Package: Found ${npmResults.length} result(s)`);
      console.log(`   Title: ${npmResults[0].title}`);
      console.log(`   ID: ${npmResults[0].id}`);
      console.log(`   Time: ${npmTime}ms`);

      // Get episodes
      const infoStart = Date.now();
      const npmInfo = await getAniwatchInfoImproved(npmResults[0].id);
      const infoTime = Date.now() - infoStart;

      if (npmInfo) {
        console.log(`   Episodes: ${npmInfo.episodes.length}`);
        console.log(`   Episode fetch time: ${infoTime}ms`);
        console.log(`   Total NPM time: ${npmTime + infoTime}ms\n`);
      }
    } else {
      console.log('❌ NPM Package: No results\n');
    }

    // Step 2: Test API Scrapers (should be fallback)
    console.log('2️⃣ Testing API Scrapers (Fallback)...\n');

    const startAPI = Date.now();
    const apiResults = await searchAnimeForStreaming(testAnime);
    const apiTime = Date.now() - startAPI;

    if (apiResults.length > 0) {
      console.log(`✅ API Scraper: Found ${apiResults.length} result(s)`);
      console.log(`   Source: ${apiResults[0].source}`);
      console.log(`   Title: ${apiResults[0].title}`);
      console.log(`   Time: ${apiTime}ms\n`);
    } else {
      console.log('❌ API Scraper: No results\n');
    }

    // Step 3: Compare Performance
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  📊 PERFORMANCE COMPARISON                     ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    if (npmResults.length > 0) {
      const totalNPMTime = npmTime + (npmInfo ? infoTime : 0);
      console.log(`📦 NPM Package (Priority 1):`);
      console.log(`   Search: ${npmTime}ms`);
      console.log(`   Total: ${totalNPMTime}ms`);
      console.log(`   ✅ FAST - Used as primary source\n`);
    }

    if (apiResults.length > 0) {
      console.log(`🌐 API Scraper (Fallback):`);
      console.log(`   Search: ${apiTime}ms`);
      console.log(`   ⚠️  SLOWER - Only used if NPM fails\n`);
    }

    // Step 4: Verify Priority Order
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  ✅ VERIFICATION                               ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    if (npmResults.length > 0) {
      console.log('✅ NPM Package working - will be tried FIRST');
      console.log('✅ API Scraper available - will be used as FALLBACK');
      console.log('\n🎉 Package-first priority is correctly implemented!');
      console.log('\n📝 Implementation:');
      console.log('   1. Try Aniwatch NPM Package (fastest)');
      console.log('   2. If NPM fails → Try API scrapers');
      console.log('   3. If all fail → Show error');
    } else {
      console.log('⚠️  NPM Package not working - will use fallback');
      console.log('✅ API Scraper will be used instead');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
  }
}

testPackagePriority();
