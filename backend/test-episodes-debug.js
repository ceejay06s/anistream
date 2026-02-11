const axios = require('axios');

// Configuration
const PROXY_SERVER_URL = process.env.PROXY_SERVER_URL || 'http://localhost:1000';
const HI_API_URL = process.env.HI_API_URL || 'http://localhost:1000';
const HI_API_BASE_PATH = '/api/v2/hianime';

async function debugEpisodes() {
  const originalAnimeId = 'jujutsu-kaisen-the-culling-game-part-1-20401';
  const cleanedAnimeId = 'jujutsu-kaisen-the-culling-game-part-1';
  const successfulAnimeId = cleanedAnimeId; // Assuming cleaned ID worked for info
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Testing Episode ID Selection Logic');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`originalAnimeId: ${originalAnimeId}`);
  console.log(`cleanedAnimeId: ${cleanedAnimeId}`);
  console.log(`successfulAnimeId: ${successfulAnimeId}`);
  
  // Updated pattern matching: use -\d{3,}$ instead of -\d+$
  // This matches 3+ digit suffixes (like -20401) but not short ones (like -1, -2)
  const hasNumericSuffix = /-\d{3,}$/.test(originalAnimeId);
  console.log(`\nHas numeric suffix (3+ digits): ${hasNumericSuffix}`);
  
  // Simulate the logic - use original ID if it has numeric suffix and is different
  const episodeAnimeId = (originalAnimeId && originalAnimeId !== successfulAnimeId && !/^\d+$/.test(originalAnimeId) && hasNumericSuffix) 
    ? originalAnimeId 
    : successfulAnimeId;
  
  console.log(`\n✅ episodeAnimeId selected: ${episodeAnimeId}`);
  
  // Test via Proxy Server endpoint (recommended)
  console.log('\n───────────────────────────────────────────────────────');
  console.log('  Test 1: Proxy Server Endpoint');
  console.log('───────────────────────────────────────────────────────');
  try {
    const proxyUrl = `${PROXY_SERVER_URL}/scrape/hianime/episodes?animeId=${encodeURIComponent(episodeAnimeId)}`;
    console.log(`   URL: ${proxyUrl}`);
    const res1 = await axios.get(proxyUrl, {
      timeout: 15000,
      validateStatus: s => s < 500,
    });
    console.log(`   Status: ${res1.status}`);
    if (res1.data?.success && res1.data?.data?.episodes) {
      console.log(`   ✅ Episodes: ${res1.data.data.episodes.length}`);
      if (res1.data.data.episodes.length > 0) {
        console.log(`   First episode: ${res1.data.data.episodes[0]?.title || res1.data.data.episodes[0]?.number || 'N/A'}`);
      }
    } else {
      console.log(`   ⚠️ No episodes in response`);
      console.log(`   Response: ${JSON.stringify(res1.data, null, 2).substring(0, 200)}...`);
    }
    
    if (res1.status === 404 || (res1.data?.success === false)) {
      console.log(`   ⚠️ Failed - trying fallback...`);
      const fallbackId = episodeAnimeId === originalAnimeId ? cleanedAnimeId : originalAnimeId;
      console.log(`   Fallback ID: ${fallbackId}`);
      const fallbackUrl = `${PROXY_SERVER_URL}/scrape/hianime/episodes?animeId=${encodeURIComponent(fallbackId)}`;
      const res2 = await axios.get(fallbackUrl, {
        timeout: 15000,
        validateStatus: s => s < 500,
      });
      console.log(`   Fallback Status: ${res2.status}`);
      if (res2.data?.success && res2.data?.data?.episodes) {
        console.log(`   ✅ Fallback Episodes: ${res2.data.data.episodes.length}`);
      } else {
        console.log(`   ⚠️ Fallback also failed`);
      }
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    if (e.response) {
      console.log(`   Response status: ${e.response.status}`);
      console.log(`   Response data: ${JSON.stringify(e.response.data).substring(0, 200)}`);
    }
  }
  
  // Test via Hi-API directly (if available)
  console.log('\n───────────────────────────────────────────────────────');
  console.log('  Test 2: Hi-API Direct Endpoint');
  console.log('───────────────────────────────────────────────────────');
  try {
    const hiApiUrl = `${HI_API_URL}${HI_API_BASE_PATH}/anime/${episodeAnimeId}/episodes`;
    console.log(`   URL: ${hiApiUrl}`);
    const res1 = await axios.get(hiApiUrl, {
      timeout: 10000,
      validateStatus: s => s < 500,
    });
    console.log(`   Status: ${res1.status}`);
    if (res1.data?.success && res1.data?.data?.episodes) {
      console.log(`   ✅ Episodes: ${res1.data.data.episodes.length}`);
    } else if (res1.data?.data?.episodes) {
      console.log(`   ✅ Episodes: ${res1.data.data.episodes.length}`);
    } else {
      console.log(`   ⚠️ No episodes in response`);
    }
    
    if (res1.status === 404) {
      console.log(`   ⚠️ 404 - trying fallback...`);
      const fallbackId = episodeAnimeId === originalAnimeId ? cleanedAnimeId : originalAnimeId;
      console.log(`   Fallback ID: ${fallbackId}`);
      const res2 = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${fallbackId}/episodes`, {
        timeout: 10000,
        validateStatus: s => s < 500,
      });
      console.log(`   Fallback Status: ${res2.status}`);
      if (res2.data?.success && res2.data?.data?.episodes) {
        console.log(`   ✅ Fallback Episodes: ${res2.data.data.episodes.length}`);
      } else if (res2.data?.data?.episodes) {
        console.log(`   ✅ Fallback Episodes: ${res2.data.data.episodes.length}`);
      } else {
        console.log(`   ⚠️ Fallback also failed`);
      }
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    if (e.code === 'ECONNREFUSED') {
      console.log(`   ⚠️ Hi-API server not running on ${HI_API_URL}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Test Complete');
  console.log('═══════════════════════════════════════════════════════');
}

debugEpisodes().catch(console.error);
