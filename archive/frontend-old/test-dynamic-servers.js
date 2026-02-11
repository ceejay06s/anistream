const { HiAnime } = require('aniwatch');

const hianime = new HiAnime.Scraper();

async function testDynamicServers() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  🎯 DYNAMIC SERVER DISCOVERY                   ║');
  console.log('║  Using getEpisodeServers() to find what works ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Search
    console.log('1️⃣ Searching for anime...');
    const searchResults = await hianime.search('Spy x Family');
    
    if (!searchResults || !searchResults.animes || searchResults.animes.length === 0) {
      console.error('❌ No search results');
      return null;
    }

    const anime = searchResults.animes[0];
    console.log(`✅ Found: ${anime.name} (${anime.id})\n`);

    // Step 2: Get episodes
    console.log('2️⃣ Getting episodes...');
    const episodesData = await hianime.getEpisodes(anime.id);
    
    if (!episodesData || !episodesData.episodes || episodesData.episodes.length === 0) {
      console.error('❌ No episodes found');
      return null;
    }

    const episode = episodesData.episodes[0];
    console.log(`✅ Episode: ${episode.title}`);
    console.log(`   Episode ID: ${episode.episodeId}\n`);

    // Step 3: 🎯 GET AVAILABLE SERVERS DYNAMICALLY
    console.log('3️⃣ Getting available servers dynamically...');
    const serversData = await hianime.getEpisodeServers(episode.episodeId);
    
    if (!serversData) {
      console.error('❌ No servers data');
      return null;
    }

    // Build list of all servers to try
    const serversToTry = [];
    
    // Add sub servers
    if (serversData.sub && Array.isArray(serversData.sub)) {
      serversData.sub.forEach(server => {
        serversToTry.push({
          name: server.serverName,
          category: 'sub'
        });
      });
    }
    
    // Add dub servers
    if (serversData.dub && Array.isArray(serversData.dub)) {
      serversData.dub.forEach(server => {
        serversToTry.push({
          name: server.serverName,
          category: 'dub'
        });
      });
    }

    console.log(`✅ Found ${serversToTry.length} servers to try:`);
    serversToTry.forEach(s => console.log(`   - ${s.name} (${s.category})`));
    console.log();

    // Step 4: 🔨 TRY EACH SERVER UNTIL ONE WORKS
    console.log('4️⃣ Testing each server...\n');
    console.log('═'.repeat(50));

    for (const server of serversToTry) {
      console.log(`\n🔄 Trying: ${server.name} (${server.category})...`);
      
      try {
        const sources = await hianime.getEpisodeSources(
          episode.episodeId, 
          server.name, 
          server.category
        );

        if (sources && sources.sources && sources.sources.length > 0) {
          console.log(`\n🎉 ✅ SUCCESS! ${server.name} (${server.category}) WORKS!`);
          console.log(`\n📺 Video Sources (${sources.sources.length}):`);
          
          sources.sources.forEach((s, i) => {
            console.log(`   ${i + 1}. Quality: ${s.quality || 'default'}`);
            console.log(`      Type: ${s.isM3U8 || s.url?.includes('.m3u8') ? 'M3U8/HLS' : 'MP4'}`);
            console.log(`      URL: ${s.url.substring(0, 70)}...`);
          });

          if (sources.subtitles && sources.subtitles.length > 0) {
            console.log(`\n📝 Subtitles: ${sources.subtitles.length} available`);
          }

          if (sources.intro) {
            console.log(`\n⏩ Intro: ${sources.intro.start}s - ${sources.intro.end}s`);
          }

          if (sources.outro) {
            console.log(`⏩ Outro: ${sources.outro.start}s - ${sources.outro.end}s`);
          }

          console.log('\n╔════════════════════════════════════════════════╗');
          console.log('║  ✅ WORKING SERVER FOUND!                      ║');
          console.log('╚════════════════════════════════════════════════╝');
          console.log(`\n🎯 Recommended Configuration:`);
          console.log(`   Server: "${server.name}"`);
          console.log(`   Category: "${server.category}"`);
          console.log(`   Sources: ${sources.sources.length}`);
          console.log(`\n💡 Use this server in your app!\n`);

          return {
            server: server.name,
            category: server.category,
            sources: sources.sources,
            subtitles: sources.subtitles || [],
            intro: sources.intro,
            outro: sources.outro,
          };
        } else {
          console.log(`   ⚠️ No sources returned`);
        }
      } catch (error) {
        const msg = error.message || 'Unknown error';
        // Only show first 80 chars of error
        console.log(`   ❌ ${msg.substring(0, 80)}`);
      }

      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n\n❌ No working servers found');
    return null;

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    return null;
  }
}

// Run the test
testDynamicServers().then(result => {
  if (result) {
    console.log('✅ Test completed successfully!');
    process.exit(0);
  } else {
    console.log('⚠️ No working servers found - consider using alternative sources');
    process.exit(1);
  }
});

