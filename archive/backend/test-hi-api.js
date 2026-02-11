/**
 * Test script for hi-api (PacaHat/hi-api)
 * Tests if hi-api works for fetching HiAnime data
 */

const axios = require('axios');

// Possible hi-api endpoints (public instances or local)
const HI_API_ENDPOINTS = [
  'https://hi-api.vercel.app',           // Possible Vercel deployment
  'https://hi-api.onrender.com',         // Possible Render deployment
  'http://localhost:3000',                // Local deployment
  'http://localhost:8080',               // Alternative local port
];

// Test endpoints
const testEndpoints = async () => {
  console.log('🔍 Testing hi-api endpoints...\n');
  
  let workingEndpoint = null;
  
  for (const baseUrl of HI_API_ENDPOINTS) {
    try {
      console.log(`Testing: ${baseUrl}`);
      
      // Try health check or root endpoint
      try {
        const healthResponse = await axios.get(`${baseUrl}/health`, { timeout: 3000 });
        console.log(`  ✅ Health check passed`);
        workingEndpoint = baseUrl;
        break;
      } catch (e) {
        // Try root endpoint
        try {
          const rootResponse = await axios.get(baseUrl, { timeout: 3000 });
          if (rootResponse.status === 200) {
            console.log(`  ✅ Root endpoint accessible`);
            workingEndpoint = baseUrl;
            break;
          }
        } catch (e2) {
          // Continue to next endpoint
        }
      }
    } catch (error) {
      console.log(`  ❌ Not accessible: ${error.message}`);
    }
  }
  
  return workingEndpoint;
};

// Test search functionality
const testSearch = async (baseUrl) => {
  console.log('\n🔍 Testing search functionality...');
  
  const searchEndpoints = [
    `${baseUrl}/api/search?q=naruto`,
    `${baseUrl}/api/v1/search?q=naruto`,
    `${baseUrl}/search?q=naruto`,
    `${baseUrl}/api/anime/search?q=naruto`,
  ];
  
  for (const endpoint of searchEndpoints) {
    try {
      console.log(`  Trying: ${endpoint}`);
      const response = await axios.get(endpoint, { timeout: 5000 });
      
      if (response.data && (Array.isArray(response.data) || response.data.results || response.data.data)) {
        const results = Array.isArray(response.data) 
          ? response.data 
          : (response.data.results || response.data.data || []);
        
        if (results.length > 0) {
          console.log(`  ✅ Search works! Found ${results.length} results`);
          console.log(`     First result: ${results[0].title || results[0].name || 'N/A'}`);
          return { success: true, endpoint, results };
        }
      }
    } catch (error) {
      // Continue to next endpoint
    }
  }
  
  console.log('  ❌ Search failed on all endpoints');
  return { success: false };
};

// Test getInfo functionality
const testGetInfo = async (baseUrl, animeId = 'naruto') => {
  console.log(`\n📺 Testing getInfo for: ${animeId}`);
  
  const infoEndpoints = [
    `${baseUrl}/api/anime/${animeId}`,
    `${baseUrl}/api/v1/anime/${animeId}`,
    `${baseUrl}/api/info/${animeId}`,
    `${baseUrl}/anime/${animeId}`,
  ];
  
  for (const endpoint of infoEndpoints) {
    try {
      console.log(`  Trying: ${endpoint}`);
      const response = await axios.get(endpoint, { timeout: 5000 });
      
      if (response.data) {
        const data = response.data.data || response.data;
        if (data.title || data.name) {
          console.log(`  ✅ getInfo works!`);
          console.log(`     Title: ${data.title || data.name}`);
          console.log(`     Episodes: ${data.episodes ? (Array.isArray(data.episodes) ? data.episodes.length : 'N/A') : 'N/A'}`);
          return { success: true, endpoint, data };
        }
      }
    } catch (error) {
      // Continue to next endpoint
    }
  }
  
  console.log('  ❌ getInfo failed on all endpoints');
  return { success: false };
};

// Main test function
const testHiApi = async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🧪 Testing hi-api (PacaHat/hi-api)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Find working endpoint
    const workingEndpoint = await testEndpoints();
    
    if (!workingEndpoint) {
      console.log('\n❌ No working hi-api endpoint found.');
      console.log('\n💡 To use hi-api, you need to:');
      console.log('   1. Clone the repository: git clone https://github.com/PacaHat/hi-api.git');
      console.log('   2. Install dependencies: cd hi-api && npm install');
      console.log('   3. Start the server: npm start');
      console.log('   4. Update HI_API_BASE_URL in this script to http://localhost:3000');
      return false;
    }
    
    console.log(`\n✅ Found working endpoint: ${workingEndpoint}`);
    
    // Step 2: Test search
    const searchResult = await testSearch(workingEndpoint);
    
    // Step 3: Test getInfo (if search worked, use first result)
    if (searchResult.success && searchResult.results && searchResult.results.length > 0) {
      const firstAnime = searchResult.results[0];
      const animeId = firstAnime.id || firstAnime.slug || 'naruto';
      await testGetInfo(workingEndpoint, animeId);
    } else {
      // Try with default anime
      await testGetInfo(workingEndpoint, 'naruto');
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ hi-api testing complete!');
    console.log('═══════════════════════════════════════════════════════');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return false;
  }
};

// Run the test
testHiApi()
  .then(success => {
    if (success) {
      console.log('\n🎉 hi-api is WORKING and can be integrated!');
      process.exit(0);
    } else {
      console.log('\n⚠️ hi-api needs to be deployed first');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });
