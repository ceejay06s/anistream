/**
 * Test script for aniwatch-api (hi-api) - Working version
 * Tests the actual API endpoints based on the source code
 */

const axios = require('axios');

const API_BASE_URL = process.env.HI_API_URL || 'http://localhost:4000';
const BASE_PATH = '/api/v2/hianime';

console.log('═══════════════════════════════════════════════════════');
console.log('  🧪 Testing aniwatch-api (hi-api)');
console.log('═══════════════════════════════════════════════════════\n');
console.log(`Base URL: ${API_BASE_URL}\n`);

// Test health endpoint
const testHealth = async () => {
  console.log('🏥 Testing health endpoint...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
    if (response.data === 'daijoubu') {
      console.log('  ✅ Health check passed\n');
      return true;
    }
  } catch (error) {
    console.log(`  ❌ Health check failed: ${error.message}\n`);
    console.log('💡 Make sure the server is running:');
    console.log('   cd backend/hi-api');
    console.log('   npm start\n');
    return false;
  }
  return false;
};

// Test search
const testSearch = async () => {
  console.log('🔍 Testing search endpoint...');
  try {
    const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/search`, {
      params: { q: 'naruto' },
      timeout: 10000,
    });
    
    if (response.data && response.data.success && response.data.data) {
      // Handle different response structures
      const results = response.data.data.results || 
                     response.data.data.animes || 
                     response.data.data.anime ||
                     (Array.isArray(response.data.data) ? response.data.data : []);
      
      if (Array.isArray(results) && results.length > 0) {
        console.log(`  ✅ Search works! Found ${results.length} results`);
        console.log(`     First result: ${results[0].title || results[0].name || 'N/A'}`);
        console.log(`     ID: ${results[0].id || 'N/A'}\n`);
        return { success: true, firstResult: results[0] };
      }
    }
    console.log('  ⚠️ Search returned empty results');
    console.log(`     Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...\n`);
    return { success: false };
  } catch (error) {
    console.log(`  ❌ Search failed: ${error.message}`);
    if (error.response) {
      console.log(`     Status: ${error.response.status}`);
      console.log(`     Data: ${JSON.stringify(error.response.data, null, 2).substring(0, 200)}...`);
    }
    console.log('');
    return { success: false };
  }
};

// Test getInfo
const testGetInfo = async (animeId) => {
  console.log(`📺 Testing getInfo for: ${animeId}...`);
  try {
    const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/anime/${animeId}`, {
      timeout: 10000,
    });
    
    if (response.data && response.data.success && response.data.data) {
      const data = response.data.data;
      console.log(`  ✅ getInfo works!`);
      console.log(`     Title: ${data.title || data.name || 'N/A'}`);
      console.log(`     Type: ${data.type || 'N/A'}`);
      console.log(`     Status: ${data.status || 'N/A'}`);
      if (data.episodes) {
        const epCount = Array.isArray(data.episodes) ? data.episodes.length : 'N/A';
        console.log(`     Episodes: ${epCount}`);
      }
      console.log('');
      return { success: true, data };
    }
    console.log('  ⚠️ getInfo returned no data');
    console.log(`     Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...\n`);
    return { success: false };
  } catch (error) {
    console.log(`  ❌ getInfo failed: ${error.message}`);
    if (error.response) {
      console.log(`     Status: ${error.response.status}`);
      console.log(`     Data: ${JSON.stringify(error.response.data, null, 2).substring(0, 300)}...`);
    }
    console.log('');
    return { success: false };
  }
};

// Test getEpisodes
const testGetEpisodes = async (animeId) => {
  console.log(`📋 Testing getEpisodes for: ${animeId}...`);
  try {
    const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/anime/${animeId}/episodes`, {
      timeout: 10000,
    });
    
    if (response.data && response.data.success && response.data.data) {
      const episodes = response.data.data.episodes || response.data.data.sub || response.data.data;
      if (Array.isArray(episodes) && episodes.length > 0) {
        console.log(`  ✅ getEpisodes works! Found ${episodes.length} episodes`);
        console.log(`     First episode: ${episodes[0].id || episodes[0].episodeId || 'N/A'}`);
        console.log(`     Episode number: ${episodes[0].number || episodes[0].episode || 'N/A'}\n`);
        return { success: true, episodes, firstEpisode: episodes[0] };
      }
    }
    console.log('  ⚠️ getEpisodes returned no episodes');
    console.log(`     Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...\n`);
    return { success: false };
  } catch (error) {
    console.log(`  ❌ getEpisodes failed: ${error.message}`);
    if (error.response) {
      console.log(`     Status: ${error.response.status}`);
      console.log(`     Data: ${JSON.stringify(error.response.data, null, 2).substring(0, 300)}...`);
    }
    console.log('');
    return { success: false };
  }
};

// Test getEpisodeSources
const testGetEpisodeSources = async (episodeId) => {
  console.log(`🎬 Testing getEpisodeSources for: ${episodeId}...`);
  
  // Try different server options
  const servers = ['hd-1', 'vidstreaming', 'streamsb', 'streamtape'];
  const categories = ['sub', 'dub'];
  
  for (const server of servers) {
    for (const category of categories) {
      try {
        const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/episode/sources`, {
          params: {
            animeEpisodeId: episodeId,
            server: server,
            category: category,
          },
          timeout: 10000,
        });
        
        if (response.data && response.data.success && response.data.data) {
          const sources = response.data.data.sources || response.data.data;
          if (Array.isArray(sources) && sources.length > 0) {
            console.log(`  ✅ getEpisodeSources works! Found ${sources.length} sources`);
            console.log(`     Server: ${server}, Category: ${category}`);
            console.log(`     First source: ${sources[0].url ? sources[0].url.substring(0, 50) + '...' : 'N/A'}`);
            console.log(`     Quality: ${sources[0].quality || 'auto'}\n`);
            return { success: true, sources, server, category };
          }
        }
      } catch (error) {
        if (error.response && error.response.status !== 500) {
          // Not a 500 error, might be a different issue
          continue;
        }
        // Log 500 errors but continue trying
        if (error.response && error.response.status === 500) {
          console.log(`     ⚠️ Server ${server}/${category} returned 500, trying next...`);
        }
      }
    }
  }
  
  // If all failed, show the last error
  try {
    const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/episode/sources`, {
      params: {
        animeEpisodeId: episodeId,
        server: 'hd-1',
        category: 'sub',
      },
      timeout: 10000,
    });
  } catch (error) {
    console.log(`  ❌ getEpisodeSources failed for all server/category combinations`);
    if (error.response) {
      console.log(`     Status: ${error.response.status}`);
      console.log(`     Error: ${JSON.stringify(error.response.data, null, 2).substring(0, 300)}...`);
    } else {
      console.log(`     Error: ${error.message}`);
    }
    console.log('');
  }
  
  return { success: false };
};

// Main test function
const runTests = async () => {
  // Step 1: Health check
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('❌ Server is not running. Please start it first.\n');
    process.exit(1);
  }
  
  // Step 2: Test search
  const searchResult = await testSearch();
  if (!searchResult.success) {
    console.log('⚠️ Search test failed, but continuing...\n');
  }
  
  // Step 3: Test getInfo
  let animeId = null;
  if (searchResult.success && searchResult.firstResult) {
    animeId = searchResult.firstResult.id || searchResult.firstResult.animeId;
    console.log(`Using anime ID from search: ${animeId}\n`);
  }
  
  if (!animeId) {
    console.log('⚠️ No valid anime ID from search, trying with a known ID...\n');
    // Try with a known working ID format (from search results we saw)
    animeId = 'road-of-naruto-18220';
  }
  
  const infoResult = await testGetInfo(animeId);
  
  // Step 4: Test getEpisodes
  const episodesResult = await testGetEpisodes(animeId);
  
  // Step 5: Test getEpisodeSources (if we have an episode)
  if (episodesResult.success && episodesResult.firstEpisode) {
    const episodeId = episodesResult.firstEpisode.id || 
                     episodesResult.firstEpisode.episodeId || 
                     `${animeId}?ep=${episodesResult.firstEpisode.number || 1}`;
    await testGetEpisodeSources(episodeId);
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('  📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Health: ${healthOk ? '✅' : '❌'}`);
  console.log(`Search: ${searchResult.success ? '✅' : '❌'}`);
  console.log(`GetInfo: ${infoResult.success ? '✅' : '❌'}`);
  console.log(`GetEpisodes: ${episodesResult.success ? '✅' : '❌'}`);
  console.log('');
  
  if (healthOk && searchResult.success && infoResult.success && episodesResult.success) {
    console.log('🎉 All tests passed! aniwatch-api is working correctly.');
    console.log('\n💡 You can now integrate it into your proxy server.');
    console.log(`   Base URL: ${API_BASE_URL}`);
    console.log(`   Base Path: ${BASE_PATH}`);
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }
  console.log('');
};

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
