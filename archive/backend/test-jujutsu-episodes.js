const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000';
const BASE_PATH = '/api/v2/hianime';

async function testJujutsuEpisodes() {
  try {
    const animeId = 'jujutsu-kaisen-the-culling-game-part-1-20401';
    console.log(`Testing episodes for: ${animeId}\n`);
    
    const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/anime/${animeId}/episodes`, {
      timeout: 10000,
    });
    
    if (response.data && response.data.success && response.data.data) {
      const episodes = response.data.data.episodes || [];
      console.log(`✅ Found ${episodes.length} episodes\n`);
      
      console.log('First 5 episodes:');
      episodes.slice(0, 5).forEach(ep => {
        console.log(`  Episode ${ep.number}: ${ep.title || 'N/A'}`);
        console.log(`    episodeId: ${ep.episodeId || 'N/A'}`);
        console.log('');
      });
      
      // Test episode sources for first episode
      if (episodes.length > 0) {
        const firstEp = episodes[0];
        const episodeId = firstEp.episodeId || `${animeId}?ep=${firstEp.number}`;
        console.log(`\nTesting episode sources for: ${episodeId}`);
        
        try {
          const sourcesRes = await axios.get(`${API_BASE_URL}${BASE_PATH}/episode/sources`, {
            params: {
              animeEpisodeId: episodeId,
              server: 'hd-1',
              category: 'sub',
            },
            timeout: 10000,
          });
          
          if (sourcesRes.data && sourcesRes.data.success) {
            const sources = sourcesRes.data.data.sources || [];
            console.log(`✅ Found ${sources.length} sources`);
            if (sources.length > 0) {
              console.log(`   First source: ${sources[0].url?.substring(0, 60)}...`);
              console.log(`   Quality: ${sources[0].quality || 'auto'}`);
            }
          }
        } catch (err) {
          console.log(`❌ Episode sources failed: ${err.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testJujutsuEpisodes();
