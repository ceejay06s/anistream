/**
 * Test script for locally deployed hi-api
 * Run this after starting hi-api locally (npm start in hi-api directory)
 */

const axios = require('axios');

const HI_API_BASE_URL = process.env.HI_API_URL || 'http://localhost:3000';

// Test endpoints based on common API patterns
const testEndpoints = async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🧪 Testing hi-api (Local Instance)');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Testing: ${HI_API_BASE_URL}\n`);
  
  // Common endpoint patterns to try
  const endpoints = [
    // Search endpoints
    { method: 'GET', path: '/api/search', params: { q: 'naruto' }, name: 'Search (q param)' },
    { method: 'GET', path: '/api/search', params: { query: 'naruto' }, name: 'Search (query param)' },
    { method: 'GET', path: '/api/v1/search', params: { q: 'naruto' }, name: 'Search v1 (q param)' },
    { method: 'GET', path: '/search', params: { q: 'naruto' }, name: 'Search root (q param)' },
    { method: 'GET', path: '/api/anime/search', params: { q: 'naruto' }, name: 'Anime Search' },
    
    // Info endpoints
    { method: 'GET', path: '/api/anime/naruto', params: {}, name: 'Anime Info' },
    { method: 'GET', path: '/api/v1/anime/naruto', params: {}, name: 'Anime Info v1' },
    { method: 'GET', path: '/api/info/naruto', params: {}, name: 'Info' },
    { method: 'GET', path: '/anime/naruto', params: {}, name: 'Anime root' },
    
    // Health/root
    { method: 'GET', path: '/health', params: {}, name: 'Health check' },
    { method: 'GET', path: '/', params: {}, name: 'Root' },
  ];
  
  let workingEndpoints = [];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${HI_API_BASE_URL}${endpoint.path}`;
      const config = {
        method: endpoint.method,
        url,
        params: endpoint.params,
        timeout: 3000,
      };
      
      const response = await axios(config);
      
      if (response.status === 200 && response.data) {
        console.log(`✅ ${endpoint.name}: ${url}`);
        
        // Check if it's a valid response
        if (Array.isArray(response.data) || 
            (typeof response.data === 'object' && (response.data.results || response.data.data || response.data.title))) {
          workingEndpoints.push({
            ...endpoint,
            url,
            data: response.data,
          });
          
          // Show sample data
          if (Array.isArray(response.data) && response.data.length > 0) {
            console.log(`   Found ${response.data.length} results`);
            console.log(`   First: ${response.data[0].title || response.data[0].name || 'N/A'}`);
          } else if (response.data.title || response.data.name) {
            console.log(`   Title: ${response.data.title || response.data.name}`);
            if (response.data.episodes) {
              const epCount = Array.isArray(response.data.episodes) 
                ? response.data.episodes.length 
                : 'N/A';
              console.log(`   Episodes: ${epCount}`);
            }
          }
        }
      }
    } catch (error) {
      // Silently continue - endpoint doesn't exist
    }
  }
  
  if (workingEndpoints.length === 0) {
    console.log('\n❌ No working endpoints found');
    console.log('\n💡 Make sure hi-api is running:');
    console.log('   1. cd hi-api');
    console.log('   2. npm start');
    console.log('   3. Check what port it runs on (usually 3000)');
    console.log('   4. Update HI_API_URL if different: export HI_API_URL=http://localhost:PORT');
    return null;
  }
  
  console.log(`\n✅ Found ${workingEndpoints.length} working endpoint(s)`);
  return workingEndpoints;
};

// Test search
const testSearch = async (baseUrl) => {
  console.log('\n🔍 Testing search...');
  
  const testQueries = ['naruto', 'one piece', 'jujutsu kaisen'];
  
  for (const query of testQueries) {
    try {
      // Try common search patterns
      const endpoints = [
        `${baseUrl}/api/search?q=${encodeURIComponent(query)}`,
        `${baseUrl}/api/search?query=${encodeURIComponent(query)}`,
        `${baseUrl}/search?q=${encodeURIComponent(query)}`,
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, { timeout: 5000 });
          if (response.data && (Array.isArray(response.data) || response.data.results)) {
            const results = Array.isArray(response.data) ? response.data : response.data.results;
            if (results.length > 0) {
              console.log(`  ✅ Search "${query}": Found ${results.length} results`);
              return { success: true, endpoint, results };
            }
          }
        } catch (e) {
          // Continue
        }
      }
    } catch (error) {
      // Continue
    }
  }
  
  console.log('  ❌ Search test failed');
  return { success: false };
};

// Main test
const main = async () => {
  try {
    // First, check if server is running
    try {
      await axios.get(`${HI_API_BASE_URL}/health`, { timeout: 2000 });
      console.log('✅ Server is running\n');
    } catch (e) {
      try {
        await axios.get(HI_API_BASE_URL, { timeout: 2000 });
        console.log('✅ Server is running\n');
      } catch (e2) {
        console.log('❌ Server is not running\n');
        console.log('💡 Start hi-api first:');
        console.log('   cd hi-api && npm start\n');
        process.exit(1);
      }
    }
    
    // Test endpoints
    const workingEndpoints = await testEndpoints();
    
    if (workingEndpoints && workingEndpoints.length > 0) {
      // Test search with first working endpoint
      const searchEndpoint = workingEndpoints.find(e => e.path.includes('search'));
      if (searchEndpoint) {
        await testSearch(HI_API_BASE_URL);
      }
      
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('  ✅ hi-api is WORKING!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n💡 Integration:');
      console.log(`   Use base URL: ${HI_API_BASE_URL}`);
      console.log(`   Working endpoints found: ${workingEndpoints.length}`);
      workingEndpoints.forEach(e => {
        console.log(`     - ${e.method} ${e.path}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
};

main();
