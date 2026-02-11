/**
 * Test script to verify if aniwatch package is still working
 */

const testAniwatch = async () => {
  try {
    console.log('Testing aniwatch package...\n');
    
    // Try to require the package
    let aniwatch;
    try {
      aniwatch = require('aniwatch');
      console.log('✅ aniwatch package loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load aniwatch package:', error.message);
      return false;
    }
    
    // Check if HiAnime is available
    if (!aniwatch.HiAnime) {
      console.error('❌ HiAnime not found in aniwatch package');
      return false;
    }
    
    console.log('✅ HiAnime found in package');
    
    // Try to create scraper instance
    let scraper;
    try {
      const ScraperClass = aniwatch.HiAnime.Scraper;
      if (!ScraperClass) {
        console.error('❌ Scraper class not found');
        return false;
      }
      scraper = new ScraperClass();
      console.log('✅ Scraper instance created');
    } catch (error) {
      console.error('❌ Failed to create scraper:', error.message);
      return false;
    }
    
    // Test search functionality
    console.log('\n🔍 Testing search functionality...');
    try {
      const searchResults = await scraper.search('naruto');
      if (searchResults && searchResults.length > 0) {
        console.log(`✅ Search works! Found ${searchResults.length} results`);
        console.log(`   First result: ${searchResults[0].title || searchResults[0].name || 'N/A'}`);
      } else {
        console.warn('⚠️ Search returned empty results');
      }
    } catch (error) {
      console.error('❌ Search failed:', error.message);
      return false;
    }
    
    // Test getInfo functionality
    console.log('\n📺 Testing getInfo functionality...');
    try {
      const info = await scraper.getInfo('naruto');
      if (info) {
        console.log(`✅ getInfo works!`);
        console.log(`   Title: ${info.title || info.name || 'N/A'}`);
        console.log(`   Episodes: ${info.episodes ? (Array.isArray(info.episodes) ? info.episodes.length : 'N/A') : 'N/A'}`);
      } else {
        console.warn('⚠️ getInfo returned null');
      }
    } catch (error) {
      console.error('❌ getInfo failed:', error.message);
      return false;
    }
    
    console.log('\n✅ All tests passed! aniwatch package is working.');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
};

// Run the test
testAniwatch()
  .then(success => {
    if (success) {
      console.log('\n🎉 aniwatch is ACTIVE and WORKING');
      process.exit(0);
    } else {
      console.log('\n⚠️ aniwatch may not be working properly');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });
