/**
 * Debug script to test episode sources endpoint and see actual error
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000';
const BASE_PATH = '/api/v2/hianime';

// Test with the episode ID we got
const testEpisodeSources = async () => {
  const episodeId = 'road-of-naruto-18220?ep=94736';
  
  console.log('Testing episode sources with different configurations...\n');
  
  // Try the exact format from the test file
  const testCases = [
    { episodeId: 'steinsgate-3?ep=230', server: 'hd-1', category: 'sub', name: 'Test file example' },
    { episodeId: episodeId, server: 'hd-1', category: 'sub', name: 'Our episode - hd-1/sub' },
    { episodeId: episodeId, server: 'vidstreaming', category: 'sub', name: 'Our episode - vidstreaming/sub' },
    { episodeId: episodeId, server: 'hd-1', category: 'dub', name: 'Our episode - hd-1/dub' },
    // Try without the numeric suffix
    { episodeId: 'road-of-naruto?ep=1', server: 'hd-1', category: 'sub', name: 'Without suffix - ep=1' },
    { episodeId: 'road-of-naruto-18220?ep=1', server: 'hd-1', category: 'sub', name: 'With suffix - ep=1' },
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`);
      console.log(`  Episode ID: ${testCase.episodeId}`);
      console.log(`  Server: ${testCase.server}, Category: ${testCase.category}`);
      
      const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/episode/sources`, {
        params: {
          animeEpisodeId: testCase.episodeId,
          server: testCase.server,
          category: testCase.category,
        },
        timeout: 10000,
      });
      
      if (response.data && response.data.success) {
        const sources = response.data.data?.sources || [];
        console.log(`  ✅ SUCCESS! Found ${sources.length} sources\n`);
        if (sources.length > 0) {
          console.log(`  First source: ${sources[0].url?.substring(0, 80)}...`);
          console.log(`  Quality: ${sources[0].quality || 'auto'}\n`);
          return { success: true, testCase, sources };
        }
      }
    } catch (error) {
      if (error.response) {
        console.log(`  ❌ Status: ${error.response.status}`);
        console.log(`  Error: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
      console.log('');
    }
  }
  
  return { success: false };
};

// Also check what episode servers are available
const testEpisodeServers = async (episodeId) => {
  console.log('\n🔍 Testing episode servers endpoint...\n');
  try {
    const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/episode/servers`, {
      params: {
        animeEpisodeId: episodeId,
      },
      timeout: 10000,
    });
    
    if (response.data && response.data.success) {
      const servers = response.data.data?.servers || response.data.data;
      console.log(`✅ Found ${Array.isArray(servers) ? servers.length : 'N/A'} servers`);
      if (Array.isArray(servers)) {
        servers.forEach((server, i) => {
          console.log(`  ${i + 1}. ${server.name || server.id || server} (${server.type || 'N/A'})`);
        });
      } else {
        console.log(`  Servers data: ${JSON.stringify(servers, null, 2).substring(0, 300)}...`);
      }
      return servers;
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  return null;
};

// Main
const main = async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🐛 Episode Sources Debug');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // First, check episode servers to see what's available
  const episodeId = 'road-of-naruto-18220?ep=94736';
  const servers = await testEpisodeServers(episodeId);
  
  // Then test sources
  const result = await testEpisodeSources();
  
  console.log('\n═══════════════════════════════════════════════════════');
  if (result.success) {
    console.log('  ✅ Found working configuration!');
    console.log(`  Episode ID: ${result.testCase.episodeId}`);
    console.log(`  Server: ${result.testCase.server}`);
    console.log(`  Category: ${result.testCase.category}`);
  } else {
    console.log('  ❌ All configurations failed');
    console.log('\n💡 Possible issues:');
    console.log('  1. Episode ID format might be incorrect');
    console.log('  2. The aniwatch package might have issues with this specific episode');
    console.log('  3. Server/category combination might not be available for this episode');
    console.log('  4. The episode might not have sources available');
  }
  console.log('═══════════════════════════════════════════════════════\n');
};

main().catch(console.error);
