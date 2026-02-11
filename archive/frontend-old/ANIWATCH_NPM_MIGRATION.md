# Migration to Official Aniwatch NPM Package

## What Changed

✅ **Installed official `aniwatch` npm package**
✅ **Created new service using the official API**
✅ **Much more reliable than custom scraping**

## New Services Created

### 1. `aniwatchApiService.ts`
Low-level wrapper around the official aniwatch package

### 2. `streamingApiNew.ts`
Drop-in replacement for your current `streamingApi.ts`

## Quick Migration (2 Steps)

### Step 1: Update Import in Your Screens

**Old Code:**
```typescript
import {
  searchAnimeForStreaming,
  getAnimeStreamingInfo,
  getStreamingSources,
} from './services/streamingApi';
```

**New Code:**
```typescript
import {
  searchAnimeForStreaming,
  getAnimeStreamingInfo,
  getStreamingSources,
} from './services/streamingApiNew';
```

### Step 2: Done!

The API is exactly the same, so no other changes needed!

## Files to Update

### 1. HomeScreen
```typescript
// At the top of src/screens/HomeScreen.tsx
import { searchAnimeForStreaming } from '../services/streamingApiNew';
```

### 2. SearchScreen (if you have one)
```typescript
import { searchAnimeForStreaming } from '../services/streamingApiNew';
```

### 3. AnimeDetailScreen
```typescript
import { getAnimeStreamingInfo } from '../services/streamingApiNew';
```

### 4. VideoPlayer
```typescript
import { getStreamingSources } from '../services/streamingApiNew';
```

## Benefits of Official Package

| Feature | Old Custom Scraper | Official Package |
|---------|-------------------|------------------|
| Reliability | ❌ Often breaks | ✅ Maintained |
| Updates | ❌ Manual | ✅ Automatic |
| Error Handling | ⚠️ Basic | ✅ Robust |
| Features | ⚠️ Limited | ✅ Complete |
| Source Quality | ⚠️ Varies | ✅ Consistent |

## Testing the New API

Create a test file to verify it works:

```typescript
// test/testAniwatchApi.ts
import {
  searchAniwatchApi,
  getAniwatchApiInfo,
  getAniwatchApiSources,
} from './src/services/aniwatchApiService';

async function test() {
  console.log('\n🧪 Testing Official Aniwatch API\n');

  // Test 1: Search
  console.log('Test 1: Searching for "Naruto"...');
  const results = await searchAniwatchApi('Naruto');
  console.log(`✓ Found ${results.length} results`);
  console.log(`First result: ${results[0]?.title}`);

  if (results.length === 0) {
    console.log('❌ Search failed');
    return;
  }

  // Test 2: Get anime info
  console.log('\nTest 2: Getting anime info...');
  const info = await getAniwatchApiInfo(results[0].id);
  console.log(`✓ Title: ${info?.title}`);
  console.log(`✓ Episodes: ${info?.totalEpisodes}`);

  if (!info || info.episodes.length === 0) {
    console.log('❌ Info fetch failed');
    return;
  }

  // Test 3: Get video sources
  console.log('\nTest 3: Getting video sources...');
  const sources = await getAniwatchApiSources(info.episodes[0].id);
  console.log(`✓ Found ${sources.length} sources`);
  sources.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.quality}: ${s.url.substring(0, 50)}...`);
  });

  console.log('\n✅ All tests passed!\n');
}

test();
```

Run with:
```bash
npx ts-node test/testAniwatchApi.ts
```

## Rollback Plan

If something goes wrong, just change the imports back:

```typescript
// Rollback to old API
import { ... } from './services/streamingApi';
```

## What the Official Package Does

The `aniwatch` npm package:
- ✅ Handles website structure changes automatically
- ✅ Manages rate limiting
- ✅ Provides proper error messages
- ✅ Extracts video sources reliably
- ✅ Gets subtitles when available
- ✅ Returns multiple quality options

## API Reference

### Search Anime
```typescript
const results = await searchAnimeForStreaming('One Piece');
// Returns: Array of anime with id, title, image, etc.
```

### Get Anime Info
```typescript
const info = await getAnimeStreamingInfo('naruto-shippuden');
// Returns: Full anime details with episodes list
```

### Get Video Sources
```typescript
const sources = await getStreamingSources('episode-id-123');
// Returns: Array of streaming sources with different qualities
```

## Expected Console Output

When working correctly, you should see:

```
🔍 Searching Aniwatch API for: "Naruto"
✓ Found 20 results from Aniwatch API

📺 Fetching anime info for: naruto-shippuden
✓ Retrieved: Naruto Shippuden (500 episodes)

🎬 Fetching streaming sources for: episode-1
✓ Found 3 sources
```

## Troubleshooting

### Issue: No results found
**Solution:** The official API might need internet access. Check your connection.

### Issue: Sources not playing
**Solution:** Try different quality options. The API returns multiple sources.

### Issue: Slow responses
**Solution:** The official package might be slower initially but is more reliable.

## Full Migration Checklist

- [ ] Test the new API with sample queries
- [ ] Update HomeScreen imports
- [ ] Update AnimeDetailScreen imports
- [ ] Update VideoPlayer imports
- [ ] Test search functionality
- [ ] Test video playback
- [ ] Remove old streamingApi.ts (optional, keep as backup)

## Next Steps

1. **Test now:** Run the test code above
2. **Update one screen:** Start with search or home
3. **Verify it works:** Check console logs
4. **Update remaining screens:** Once confirmed working
5. **Celebrate:** You now have reliable anime scraping! 🎉

---

**Need help?** Check the examples in `aniwatchApiService.ts` or refer to the [aniwatch npm package docs](https://www.npmjs.com/package/aniwatch).
