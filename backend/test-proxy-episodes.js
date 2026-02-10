const axios = require('axios');

async function testProxyEpisodes() {
  try {
    const animeId = 'jujutsu-kaisen-the-culling-game-part-1-20401';
    console.log(`Testing proxy server episodes for: ${animeId}\n`);
    
    // Test direct hi-api call
    console.log('1. Testing direct hi-api call...');
    try {
      const directRes = await axios.get(`http://localhost:4000/api/v2/hianime/anime/${animeId}/episodes`, {
        timeout: 10000,
        validateStatus: s => s < 500,
      });
      console.log(`   Status: ${directRes.status}`);
      console.log(`   Episodes: ${directRes.data?.data?.episodes?.length || 0}`);
      if (directRes.data?.data?.episodes?.length > 0) {
        console.log(`   First episode: ${directRes.data.data.episodes[0].title} (ID: ${directRes.data.data.episodes[0].episodeId})`);
      }
    } catch (e) {
      console.log(`   Direct call failed: ${e.message}`);
    }
    
    console.log('\n2. Testing proxy server info endpoint...');
    const proxyRes = await axios.get(`http://localhost:1000/scrape/hianime/info`, {
      params: { animeId },
      timeout: 15000,
    });
    
    console.log(`   Status: ${proxyRes.status}`);
    console.log(`   Success: ${proxyRes.data?.success}`);
    console.log(`   Episodes: ${proxyRes.data?.data?.episodes?.length || 0}`);
    if (proxyRes.data?.data?.episodes?.length > 0) {
      console.log(`   First episode: ${proxyRes.data.data.episodes[0].title} (ID: ${proxyRes.data.data.episodes[0].id})`);
    } else {
      console.log(`   ⚠️ No episodes returned by proxy server`);
      console.log(`   Response data:`, JSON.stringify(proxyRes.data, null, 2).substring(0, 500));
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
  }
}

testProxyEpisodes();
