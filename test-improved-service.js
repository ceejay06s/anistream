/**
 * Test the improved Aniwatch service
 */

const { HiAnime } = require('aniwatch');

const aniwatch = new HiAnime.Scraper();

// Replicate the improved service logic
async function getAniwatchSourcesWithFallback(episodeId) {
  console.log(`🎯 Dynamic server discovery for: ${episodeId}`);

  try {
    // Step 1: Get available servers
    console.log('  🔍 Getting available servers...');
    const serversData = await aniwatch.getEpisodeServers(episodeId);

    if (!serversData || (!serversData.sub && !serversData.dub)) {
      console.error('  ❌ No servers available');
      return [];
    }

    // Step 2: Build list
    const serversToTry = [];
    
    if (serversData.sub) {
      serversData.sub.forEach(s => serversToTry.push({ name: s.serverName, category: 'sub' }));
    }
    if (serversData.dub) {
      serversData.dub.forEach(s => serversToTry.push({ name: s.serverName, category: 'dub' }));
    }

    console.log(`  ✅ Found ${serversToTry.length} servers:`, serversToTry.map(s => `${s.name}(${s.category})`).join(', '));

    // Step 3: Try each
    for (const server of serversToTry) {
      try {
        console.log(`  🔄 Trying: ${server.name} (${server.category})...`);
        
        const result = await aniwatch.getEpisodeSources(episodeId, server.name, server.category);

        if (result && result.sources && result.sources.length > 0) {
          console.log(`  ✅ SUCCESS! ${server.name} (${server.category})`);
          
          return result.sources.map(source => ({
            url: source.url,
            quality: source.quality || 'default',
            isM3U8: source.url?.includes('.m3u8') || source.type === 'hls',
            server: server.name,
            category: server.category,
            subtitles: result.subtitles || [],
          }));
        }
      } catch (error) {
        console.log(`  ❌ ${server.name}: ${error.message.substring(0, 50)}`);
      }

      await new Promise(resolve => setTimeout(resolve, 250));
    }

    return [];
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return [];
  }
}

async function testImprovedService() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  ✨ IMPROVED ANIWATCH SERVICE TEST             ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    // Test Case 1: Spy x Family
    console.log('📺 Test 1: Spy x Family\n');
    const search1 = await aniwatch.search('Spy x Family');
    const anime1 = search1.animes[0];
    const episodes1 = await aniwatch.getEpisodes(anime1.id);
    const sources1 = await getAniwatchSourcesWithFallback(episodes1.episodes[0].episodeId);
    
    if (sources1.length > 0) {
      console.log(`✅ SUCCESS: ${sources1.length} sources from ${sources1[0].server} (${sources1[0].category})`);
      console.log(`   URL: ${sources1[0].url.substring(0, 60)}...`);
      console.log(`   Subtitles: ${sources1[0].subtitles.length}\n`);
    } else {
      console.log('❌ FAILED: No sources\n');
    }

    // Test Case 2: One Piece
    console.log('📺 Test 2: One Piece\n');
    const search2 = await aniwatch.search('One Piece');
    const anime2 = search2.animes.find(a => a.id === 'one-piece-100');
    const episodes2 = await aniwatch.getEpisodes(anime2.id);
    const sources2 = await getAniwatchSourcesWithFallback(episodes2.episodes[0].episodeId);
    
    if (sources2.length > 0) {
      console.log(`✅ SUCCESS: ${sources2.length} sources from ${sources2[0].server} (${sources2[0].category})`);
      console.log(`   URL: ${sources2[0].url.substring(0, 60)}...`);
      console.log(`   Subtitles: ${sources2[0].subtitles.length}\n`);
    } else {
      console.log('❌ FAILED: No sources\n');
    }

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL TESTS COMPLETED                        ║');
    console.log('╚════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testImprovedService();

