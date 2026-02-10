const axios = require('axios');

async function debugEpisodes() {
  const originalAnimeId = 'jujutsu-kaisen-the-culling-game-part-1-20401';
  const cleanedAnimeId = 'jujutsu-kaisen-the-culling-game-part-1';
  const successfulAnimeId = cleanedAnimeId; // Assuming cleaned ID worked for info
  
  console.log('Testing episode ID selection logic:');
  console.log(`originalAnimeId: ${originalAnimeId}`);
  console.log(`successfulAnimeId: ${successfulAnimeId}`);
  
  // Simulate the logic
  const episodeAnimeId = (originalAnimeId && originalAnimeId !== successfulAnimeId && !/^\d+$/.test(originalAnimeId)) 
    ? originalAnimeId 
    : successfulAnimeId;
  
  console.log(`\nepisodeAnimeId selected: ${episodeAnimeId}`);
  
  // Test both IDs
  console.log('\nTesting with episodeAnimeId:', episodeAnimeId);
  try {
    const res1 = await axios.get(`http://localhost:4000/api/v2/hianime/anime/${episodeAnimeId}/episodes`, {
      timeout: 10000,
      validateStatus: s => s < 500,
    });
    console.log(`   Status: ${res1.status}`);
    console.log(`   Episodes: ${res1.data?.data?.episodes?.length || 0}`);
    if (res1.status === 404) {
      console.log(`   ⚠️ 404 - trying fallback...`);
      const fallbackId = episodeAnimeId === originalAnimeId ? successfulAnimeId : originalAnimeId;
      console.log(`   Fallback ID: ${fallbackId}`);
      const res2 = await axios.get(`http://localhost:4000/api/v2/hianime/anime/${fallbackId}/episodes`, {
        timeout: 10000,
        validateStatus: s => s < 500,
      });
      console.log(`   Fallback Status: ${res2.status}`);
      console.log(`   Fallback Episodes: ${res2.data?.data?.episodes?.length || 0}`);
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }
}

debugEpisodes();
