const axios = require('axios');

async function testAPI() {
  console.log('Testing Consumet API...\n');

  try {
    console.log('1. Testing GoGoAnime search...');
    const response = await axios.get('https://api.consumet.org/anime/gogoanime/naruto', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('Error details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
      console.error('Request:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAPI();
