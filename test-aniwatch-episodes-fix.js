const { HiAnime } = require('aniwatch');
const aniwatch = new HiAnime.Scraper();

async function testEpisodes() {
  console.log('Testing Aniwatch episode structure...\n');

  try {
    const animeId = 'one-piece-100';
    console.log(`Getting info for: ${animeId}`);

    const info = await aniwatch.getInfo(animeId);

    console.log('\nFull response keys:');
    console.log(Object.keys(info));

    console.log('\nAnime info keys:');
    console.log(Object.keys(info.anime));

    // Check if there's an episodes property anywhere
    console.log('\nLooking for episodes...');

    if (info.episodes) {
      console.log(`✅ Found ${info.episodes.length} episodes at info.episodes`);
      console.log('First episode:', JSON.stringify(info.episodes[0], null, 2));
    } else {
      console.log('❌ No info.episodes');
    }

    if (info.anime.episodes) {
      console.log(`✅ Found ${info.anime.episodes.length} episodes at info.anime.episodes`);
    } else {
      console.log('❌ No info.anime.episodes');
    }

    // Check seasons
    if (info.seasons && info.seasons.length > 0) {
      console.log(`\n✅ Found ${info.seasons.length} seasons`);
      console.log('First 3 seasons:');
      info.seasons.slice(0, 3).forEach(season => {
        console.log(`  - ${season.name} (${season.id})`);
      });

      // Try getting the main series season (not the current movie)
      const mainSeason = info.seasons.find(s => s.id === 'one-piece-100');
      if (mainSeason) {
        console.log(`\nMain series season found: ${mainSeason.name}`);
        console.log('It is current:', mainSeason.isCurrent);
      }
    }

    // Try accessing episodes data endpoint directly
    console.log('\n\nTrying to get episodes via getEpisodes method (if exists)...');
    if (typeof aniwatch.getEpisodes === 'function') {
      const episodes = await aniwatch.getEpisodes(animeId);
      console.log('Episodes response:', JSON.stringify(episodes, null, 2).substring(0, 500));
    } else {
      console.log('No getEpisodes method available');
    }

    // Check what methods are available
    console.log('\n\nAvailable methods on aniwatch object:');
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(aniwatch)).filter(m => m !== 'constructor'));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEpisodes();
