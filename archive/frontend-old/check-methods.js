const { HiAnime } = require('aniwatch');
const h = new HiAnime.Scraper();

console.log('Available methods:');
Object.getOwnPropertyNames(Object.getPrototypeOf(h)).forEach(m => {
  if (!m.startsWith('_') && m !== 'constructor') {
    console.log(`  - ${m}`);
  }
});
