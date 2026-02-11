# Integration Guide - Enhanced Anime Scraping

## What Was Fixed

✅ **Fixed duplicate React keys warning** in AnimeDetailScreen.tsx
✅ **Created 5 new enhanced scraping services**
✅ **Integrated Consumet API with 5+ providers**

## Quick Integration

### Option 1: Use Enhanced API (Easiest)

Replace your current streaming API imports with the enhanced version:

```typescript
// Old way
import { searchAniwatchAnime } from './services/aniwatchScraper';

// New way - one import for everything
import { enhancedStreamingApi } from './services/enhancedStreamingApi';

// Usage
const results = await enhancedStreamingApi.searchAnime('Naruto');
const info = await enhancedStreamingApi.getAnimeInfo(animeId);
const sources = await enhancedStreamingApi.getVideoSources(episodeId);
```

### Option 2: Use Specific Services

```typescript
// Consumet API (Best for production)
import { searchAnime, getAnimeInfo, getEpisodeSources, AnimeProvider } from './services/consumetService';

const results = await searchAnime('One Piece', AnimeProvider.GOGOANIME);
const info = await getAnimeInfo(animeId, AnimeProvider.ZORO);
const sources = await getEpisodeSources(episodeId, AnimeProvider.ANIMEPAHE);
```

## Update Your Components

### Update AnimeDetailScreen

Your screen already uses the correct pattern now (fixed duplicate keys), but you can enhance it:

```typescript
import { enhancedStreamingApi } from '../services/enhancedStreamingApi';

// In your component
const loadAnimeDetails = async () => {
  try {
    const info = await enhancedStreamingApi.getAnimeInfo(animeId);
    if (info) {
      setAnime(info);
      setEpisodes(info.episodes);
    }
  } catch (error) {
    console.error('Error loading anime:', error);
  }
};
```

### Update VideoPlayer

```typescript
import { enhancedStreamingApi } from '../services/enhancedStreamingApi';

const loadVideoSources = async () => {
  try {
    const sources = await enhancedStreamingApi.getVideoSources(episodeId);
    if (sources.length > 0) {
      // Pick best quality
      const bestSource = sources.find(s => s.quality === '1080p') || sources[0];
      setVideoUrl(bestSource.url);
    }
  } catch (error) {
    console.error('Error loading video:', error);
  }
};
```

## Available Services

### 1. Enhanced Streaming API
**File**: `src/services/enhancedStreamingApi.ts`
- Combines all services
- Automatic fallback
- Best for production

### 2. Consumet Service
**File**: `src/services/consumetService.ts`
- 5+ anime providers
- Battle-tested
- Most reliable

### 3. Unified Service
**File**: `src/services/unifiedAnimeService.ts`
- All-in-one search
- Video extraction
- Multiple sources

### 4. Improved GoGoAnime
**File**: `src/services/improvedGogoanimeScraper.ts`
- Better DOM parsing
- Error handling
- GoGoAnime focused

### 5. Multi-Source Scraper
**File**: `src/services/multiSourceScraper.ts`
- Zoro, AnimePahe, 9anime
- Custom implementations
- Full control

### 6. Video Extractor
**File**: `src/services/videoExtractor.ts`
- Decrypts video sources
- Handles encryption
- Multiple servers

## Migration Steps

### Step 1: Test Enhanced API

Create a test file:

```typescript
// test/testEnhancedApi.ts
import { enhancedStreamingApi } from '../src/services/enhancedStreamingApi';

async function test() {
  console.log('Testing enhanced API...\n');

  // Search
  const results = await enhancedStreamingApi.searchAnime('Naruto');
  console.log(`Found ${results.length} results`);

  if (results.length > 0) {
    // Get info
    const info = await enhancedStreamingApi.getAnimeInfo(results[0].id);
    console.log(`Anime: ${info?.title}, Episodes: ${info?.totalEpisodes}`);

    if (info && info.episodes.length > 0) {
      // Get sources
      const sources = await enhancedStreamingApi.getVideoSources(info.episodes[0].id);
      console.log(`Found ${sources.length} video sources`);
      sources.forEach(s => console.log(`- ${s.quality}: ${s.url.substring(0, 50)}...`));
    }
  }
}

test();
```

### Step 2: Update Search Screen

```typescript
// Before
const searchResults = await searchAniwatchAnime(query);

// After
const searchResults = await enhancedStreamingApi.searchAnime(query);
```

### Step 3: Update Detail Screen

```typescript
// Before
const info = await getAniwatchAnimeInfo(animeId);

// After
const info = await enhancedStreamingApi.getAnimeInfo(animeId);
```

### Step 4: Update Video Player

```typescript
// Before
const sources = await getAniwatchStreamSources(episodeId);

// After
const sources = await enhancedStreamingApi.getVideoSources(episodeId);
```

## Troubleshooting

### No Results Found?

```typescript
// Try multiple providers
import { consumetService, AnimeProvider } from './services/consumetService';

const tryAllProviders = async (query) => {
  const providers = [
    AnimeProvider.GOGOANIME,
    AnimeProvider.ZORO,
    AnimeProvider.ANIMEPAHE,
  ];

  for (const provider of providers) {
    const results = await consumetService.search(query, provider);
    if (results.length > 0) {
      console.log(`Found on ${provider}:`, results);
      return results;
    }
  }

  return [];
};
```

### Video Won't Play?

```typescript
// Get all available sources and try them
const sources = await enhancedStreamingApi.getVideoSources(episodeId);

// Try each source
for (const source of sources) {
  try {
    console.log(`Trying ${source.quality} from ${source.server}...`);
    // Try loading this source
    break; // If successful
  } catch (error) {
    console.log(`Failed, trying next...`);
  }
}
```

### Slow Performance?

```typescript
// Use specific provider instead of searching all
import { improvedGogoScraper } from './services/improvedGogoanimeScraper';

// Faster for GoGoAnime
const results = await improvedGogoScraper.search(query);
const info = await improvedGogoScraper.getAnimeInfo(animeId);
```

## Benefits of New System

| Feature | Old System | New System |
|---------|-----------|------------|
| Providers | 1-2 | 8+ |
| Fallback | Limited | Automatic |
| Decryption | Basic | Advanced |
| Video Quality | Auto | Multiple |
| Subtitles | No | Yes |
| Error Handling | Basic | Robust |
| Maintenance | High | Low (Consumet) |

## Next Steps

1. ✅ Test the enhanced API with a few anime
2. ✅ Update one screen at a time
3. ✅ Keep old code as fallback initially
4. ✅ Monitor console logs for errors
5. ✅ Switch fully once stable

## Support

- Full documentation: [ANIME_SCRAPING_GUIDE.md](./ANIME_SCRAPING_GUIDE.md)
- Quick reference: [SCRAPING_QUICK_START.md](./SCRAPING_QUICK_START.md)
- Examples in each service file

---

**Note**: The duplicate key warning is now fixed. Your app should work better with these enhanced services!
