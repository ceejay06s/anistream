/**
 * Integration Test: Verify brute-force logic works with streamingApi
 */

const { getStreamingSourcesWithFallback } = require('./src/services/streamingApi.ts');

async function testIntegration() {
  console.log('🧪 Testing brute-force integration with streamingApi\n');

  try {
    // Test with a real episode ID
    const episodeId = 'spy-x-family-17977?ep=89506';

    console.log('Testing episode:', episodeId);
    console.log('Calling getStreamingSourcesWithFallback...\n');

    const result = await getStreamingSourcesWithFallback(episodeId);

    if (!result || !result.sources || result.sources.length === 0) {
      console.error('❌ FAILED: No sources returned');
      return;
    }

    console.log('\n✅ SUCCESS!');
    console.log(`Found ${result.sources.length} source(s):`);
    result.sources.forEach((source, index) => {
      console.log(`  ${index + 1}. Quality: ${source.quality}`);
      console.log(`     URL: ${source.url.substring(0, 80)}...`);
      console.log(`     M3U8: ${source.isM3U8}`);
    });

    console.log('\nHeaders:', result.headers);

    console.log('\n🎉 Integration test passed!');
    console.log('The brute-force logic is working correctly with streamingApi.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

testIntegration();
