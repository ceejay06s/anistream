const { HiAnime } = require('aniwatch');
const aniwatch = new HiAnime.Scraper();

async function testDetailed() {
  console.log('Testing Aniwatch with detailed logging...\n');

  try {
    // Search for One Piece
    console.log('1. Searching for "One Piece"...');
    const searchResults = await aniwatch.search('One Piece');

    console.log('\nFull search results:');
    console.log(JSON.stringify(searchResults, null, 2));

    if (searchResults && searchResults.animes && searchResults.animes.length > 0) {
      const anime = searchResults.animes[0];
      console.log(`\n2. Getting info for: ${anime.id}`);

      const info = await aniwatch.getInfo(anime.id);

      console.log('\nFull anime info:');
      console.log(JSON.stringify(info, null, 2));

      if (info && info.seasons && info.seasons.length > 0) {
        console.log(`\n3. Found ${info.seasons.length} seasons`);
        const firstSeason = info.seasons[0];
        console.log(`   First season ID: ${firstSeason.id}`);

        // Try getting info for the first season
        const seasonInfo = await aniwatch.getInfo(firstSeason.id);
        console.log('\nSeason info:');
        console.log(JSON.stringify(seasonInfo, null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testDetailed();
