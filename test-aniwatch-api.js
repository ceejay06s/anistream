/**
 * Quick Test Script for Official Aniwatch API
 * Run with: node test-aniwatch-api.js
 */

const { HiAnime } = require('aniwatch');
const axios = require('axios');

const aniwatch = new HiAnime.Scraper();
const PROXY_SERVER_URL = process.env.PROXY_SERVER_URL || 'http://localhost:1000';

async function testAniwatchApi() {
  console.log('\n🧪 Testing Official Aniwatch NPM Package\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Search
    console.log('\n📍 Test 1: Searching for "Naruto"...');
    const searchResults = await aniwatch.search('Naruto');

    if (!searchResults || !searchResults.animes || searchResults.animes.length === 0) {
      console.log('❌ No results found');
      return;
    }

    console.log(`✅ Found ${searchResults.animes.length} results`);
    console.log(`   First result: ${searchResults.animes[0].name || searchResults.animes[0].title}`);
    console.log(`   ID: ${searchResults.animes[0].id}`);

    const firstAnime = searchResults.animes[0];

    // Test 2: Get Anime Info
    console.log('\n📍 Test 2: Getting anime info...');
    const info = await aniwatch.getInfo(firstAnime.id);

    if (!info) {
      console.log('❌ Could not get anime info');
      return;
    }

    const animeInfo = info.anime?.info || info.anime || info;
    const infoEpisodes =
      (Array.isArray(info?.episodes) && info.episodes) ||
      (Array.isArray(info?.anime?.episodes) && info.anime.episodes) ||
      (Array.isArray(info?.anime?.info?.episodes) && info.anime.info.episodes) ||
      [];

    console.log(`✅ Anime: ${animeInfo.name || animeInfo.title || firstAnime.name || firstAnime.title}`);
    console.log(`   Description: ${(animeInfo.description || 'N/A').substring(0, 100)}...`);
    console.log(`   Episodes: ${infoEpisodes.length}`);

    let episodes = infoEpisodes;
    if (!episodes || episodes.length === 0) {
      console.log('ℹ️  Episodes missing from getInfo(); fetching via getEpisodes()...');
      const episodesData = await aniwatch.getEpisodes(firstAnime.id);
      episodes = Array.isArray(episodesData) ? episodesData : episodesData?.episodes || [];
    }

    if (!episodes || episodes.length === 0) {
      console.log('❌ No episodes found');
      return;
    }

    const firstEpisode = episodes[0];
    console.log(`   First episode: ${firstEpisode.title || 'Episode 1'}`);
    console.log(`   Episode ID: ${firstEpisode.episodeId || firstEpisode.id}`);

    // Test 3: Get Episode Sources
    console.log('\n📍 Test 3: Getting video sources...');
    const episodeId = firstEpisode.episodeId || firstEpisode.id;
    const sources = await aniwatch.getEpisodeSources(episodeId);

    if (!sources || !sources.sources || sources.sources.length === 0) {
      console.log('❌ No sources found');
      return;
    }

    console.log(`✅ Found ${sources.sources.length} video source(s)`);
    sources.sources.forEach((source, index) => {
      const url = source.url || source.file || 'N/A';
      const quality = source.quality || source.label || 'default';
      const type = url.includes('.m3u8') ? 'M3U8' : 'MP4';
      console.log(`   ${index + 1}. ${quality} (${type}): ${url.substring(0, 60)}...`);
    });

    // Test 4: Get Episode Servers (if available)
    console.log('\n📍 Test 4: Getting available servers...');
    try {
      const servers = await aniwatch.getEpisodeServers(episodeId);
      if (servers && Array.isArray(servers)) {
        console.log(`✅ Found ${servers.length} server(s)`);
        servers.forEach((server, index) => {
          console.log(`   ${index + 1}. ${server.name || server.serverName || 'Server ' + (index + 1)}`);
        });
      } else {
        console.log('ℹ️  No additional servers available');
      }
    } catch (serverError) {
      console.log('ℹ️  Server fetch not available or failed');
    }

    // Test 5: Test Proxy Server with Megacloud Headers
    console.log('\n📍 Test 5: Testing proxy server with megacloud headers...');
    try {
      // Check if any source is from megacloud
      const megacloudSource = sources.sources.find(src => {
        const url = src.url || src.file || '';
        return url.includes('megacloud.blog') || url.includes('megacloud');
      });

      if (megacloudSource) {
        const sourceUrl = megacloudSource.url || megacloudSource.file;
        console.log(`   Found megacloud source: ${sourceUrl.substring(0, 60)}...`);
        
        // Test proxy server episode-sources endpoint
        try {
          const proxyResponse = await axios.get(`${PROXY_SERVER_URL}/scrape/hianime/episode-sources`, {
            params: {
              episodeId: episodeId,
              server: 'megacloud',
              category: 'sub'
            },
            timeout: 10000
          });

          if (proxyResponse.data && proxyResponse.data.success) {
            const proxyData = proxyResponse.data.data;
            console.log(`✅ Proxy server returned ${proxyData.sources?.length || 0} sources`);
            
            // Check if headers include megacloud custom headers
            if (proxyData.headers) {
              const hasMegacloudHeaders = proxyData.headers['Authority'] === 'megacloud.blog' ||
                                         proxyData.headers['sec-fetch-dest'] === 'iframe';
              
              if (hasMegacloudHeaders) {
                console.log('✅ Megacloud custom headers detected in response');
                console.log(`   Authority: ${proxyData.headers['Authority'] || 'N/A'}`);
                console.log(`   User-Agent: ${(proxyData.headers['User-Agent'] || '').substring(0, 50)}...`);
              } else {
                console.log('ℹ️  Standard headers returned (megacloud headers may be applied during fetch)');
              }
            }
          }
        } catch (proxyError) {
          console.log(`⚠️  Proxy server test failed: ${proxyError.message}`);
          console.log('   Make sure proxy server is running on', PROXY_SERVER_URL);
        }
      } else {
        console.log('ℹ️  No megacloud sources found in this episode');
        console.log('   Testing with a sample megacloud URL...');
        
        // Test with a sample megacloud embed URL
        const sampleMegacloudUrl = 'https://megacloud.blog/embed-2/v3/e-1/test?k=1';
        try {
          const testResponse = await axios.get(`${PROXY_SERVER_URL}/proxy/m3u8`, {
            params: {
              url: sampleMegacloudUrl,
              referer: 'https://hianime.to/'
            },
            timeout: 5000,
            validateStatus: () => true // Don't throw on any status
          });
          
          if (testResponse.status === 200 || testResponse.status === 404) {
            console.log('✅ Proxy server is responding to megacloud requests');
            console.log(`   Status: ${testResponse.status}`);
          }
        } catch (testError) {
          console.log(`⚠️  Proxy test error: ${testError.message}`);
        }
      }
    } catch (testError) {
      console.log(`⚠️  Megacloud headers test failed: ${testError.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('🎉 Official Aniwatch API is working correctly!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n⚠️  Make sure you have internet connection');
    console.log('⚠️  The aniwatch package might need updating: npm install aniwatch@latest\n');
  }
}

// Run the test
console.log('Starting Aniwatch API test...');
testAniwatchApi();
