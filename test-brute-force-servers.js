const { HiAnime } = require('aniwatch');

const hianime = new HiAnime.Scraper();

// List of all known servers to try
const SERVERS_TO_TRY = [
  'hd-1', 'hd-2', 'hd-3',           // HD servers
  'vidstreaming', 'megacloud',      // Primary servers
  'streamtape', 'mp4upload',        // Alternative servers
  'doodstream', 'filemoon',         // More alternatives
  'vidcloud', 'streamlare'          // Additional options
];

async function bruteForceServers() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  🔨 BRUTE FORCE SERVER TEST                    ║');
  console.log('║  Trying all available servers...              ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Search
    console.log('1️⃣ Searching for anime...');
    const searchResults = await hianime.search('Spy x Family');
    
    if (!searchResults || !searchResults.animes || searchResults.animes.length === 0) {
      console.error('❌ No search results');
      return;
    }

    const anime = searchResults.animes[0];
    console.log(`✅ Found: ${anime.name} (${anime.id})\n`);

    // Step 2: Get episodes
    console.log('2️⃣ Getting episodes...');
    const episodesData = await hianime.getEpisodes(anime.id);
    
    if (!episodesData || !episodesData.episodes || episodesData.episodes.length === 0) {
      console.error('❌ No episodes found');
      return;
    }

    const episode = episodesData.episodes[0];
    console.log(`✅ Episode: ${episode.title}`);
    console.log(`   Episode ID: ${episode.episodeId}\n`);

    // Step 3: Get available servers
    console.log('3️⃣ Getting available servers...');
    const serversData = await hianime.getEpisodeServers(episode.episodeId);
    
    const availableServers = [];
    if (serversData) {
      if (serversData.sub) availableServers.push(...serversData.sub.map(s => ({ ...s, category: 'sub' })));
      if (serversData.dub) availableServers.push(...serversData.dub.map(s => ({ ...s, category: 'dub' })));
    }

    console.log(`✅ Found ${availableServers.length} servers:`);
    availableServers.forEach(s => console.log(`   - ${s.serverName} (${s.category})`));
    console.log();

    // Step 4: BRUTE FORCE - Try each server
    console.log('4️⃣ BRUTE FORCING SERVERS...\n');
    console.log('═'.repeat(50));

    const workingServers = [];
    const failedServers = [];

    // Try available servers first
    for (const serverInfo of availableServers) {
      const serverName = serverInfo.serverName;
      const category = serverInfo.category;
      
      console.log(`\n🔄 Trying: ${serverName} (${category})...`);
      
      try {
        const sources = await hianime.getEpisodeSources(episode.episodeId, serverName, category);

        if (sources && sources.sources && sources.sources.length > 0) {
          console.log(`✅ SUCCESS! ${serverName} works!`);
          console.log(`   Found ${sources.sources.length} source(s):`);
          sources.sources.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s.quality} - ${s.url.substring(0, 60)}...`);
          });
          
          workingServers.push({ 
            server: serverName, 
            category: category, 
            sources: sources.sources.length,
            quality: sources.sources.map(s => s.quality).join(', ')
          });
        } else {
          console.log(`❌ ${serverName}: No sources returned`);
          failedServers.push({ server: serverName, category: category, reason: 'No sources' });
        }
      } catch (error) {
        console.log(`❌ ${serverName}: ${error.message}`);
        failedServers.push({ server: serverName, category: category, reason: error.message });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // If no available servers worked, try fallback servers
    if (workingServers.length === 0) {
      console.log('\n\n🔨 No available servers worked. Trying fallback servers...\n');
      
      for (const serverName of SERVERS_TO_TRY) {
        // Skip if already tried
        if (availableServers.some(s => s.serverName === serverName)) continue;

        console.log(`\n🔄 Trying fallback: ${serverName}...`);
        
        try {
          const sources = await hianime.getEpisodeSources(episode.episodeId, serverName, 'sub');

          if (sources && sources.sources && sources.sources.length > 0) {
            console.log(`✅ SUCCESS! ${serverName} works!`);
            console.log(`   Found ${sources.sources.length} source(s)`);
            
            workingServers.push({ 
              server: serverName, 
              category: 'sub', 
              sources: sources.sources.length 
            });
          }
        } catch (error) {
          console.log(`❌ ${serverName}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 5: Results
    console.log('\n\n╔════════════════════════════════════════════════╗');
    console.log('║  📊 RESULTS                                    ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    if (workingServers.length > 0) {
      console.log(`✅ WORKING SERVERS (${workingServers.length}):`);
      workingServers.forEach(s => {
        console.log(`   ✓ ${s.server} (${s.category}): ${s.sources} sources - ${s.quality || 'N/A'}`);
      });
      console.log('\n🎉 SUCCESS! Found working servers!');
      console.log(`\n📝 Recommended server: ${workingServers[0].server}`);
      console.log(`   Use this in your app's streaming configuration.\n`);
    } else {
      console.log('❌ NO WORKING SERVERS FOUND\n');
      console.log('Failed servers:');
      failedServers.slice(0, 5).forEach(s => {
        console.log(`   ✗ ${s.server} (${s.category}): ${s.reason}`);
      });
      console.log('\n💡 Recommendation: Use alternative sources (Shafilm, GoGoAnime, AnimeHeaven)');
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
  }
}

// Run the brute force test
bruteForceServers();

