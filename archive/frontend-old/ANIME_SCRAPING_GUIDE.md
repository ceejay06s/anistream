# Complete Anime Scraping Solutions Guide

This guide covers all four improved anime scraping solutions implemented in your project.

## 📦 Installed Packages

```bash
npm install @consumet/extensions axios cheerio crypto-js hls-parser
```

## 🎯 Four Solutions Overview

### 1. **Consumet API Integration** (Recommended)
- **File**: `src/services/consumetService.ts`
- **Providers**: GoGoAnime, Zoro, AnimePahe, 9anime, AnimeFox
- **Best for**: Production use, reliability, multiple sources
- **Pros**: Battle-tested, maintained, handles decryption
- **Cons**: Requires internet, depends on external library

### 2. **Multi-Source Scrapers**
- **File**: `src/services/multiSourceScraper.ts`
- **Providers**: Zoro, AnimePahe, 9anime
- **Best for**: Custom implementations, flexibility
- **Pros**: Full control, no external dependencies
- **Cons**: Requires maintenance when sites change

### 3. **Improved GoGoAnime Scraper**
- **File**: `src/services/improvedGogoanimeScraper.ts`
- **Providers**: GoGoAnime with Cheerio DOM parsing
- **Best for**: GoGoAnime-focused applications
- **Pros**: Robust parsing, proper error handling
- **Cons**: Single source only

### 4. **Video Extraction with Decryption**
- **File**: `src/services/videoExtractor.ts`
- **Servers**: GogoPlay, Kwik, RapidCloud
- **Best for**: Extracting actual video URLs from embed pages
- **Pros**: Handles encryption, multiple server types
- **Cons**: Complex, may break if encryption changes

### 5. **Unified Service** (All-in-One)
- **File**: `src/services/unifiedAnimeService.ts`
- **Combines**: All above services with intelligent fallback
- **Best for**: Comprehensive solution with maximum reliability

---

## 🚀 Quick Start Examples

### Example 1: Simple Search (Consumet API)

```typescript
import { searchAnime, AnimeProvider } from './services/consumetService';

async function searchExample() {
  // Search single provider
  const results = await searchAnime('Naruto', AnimeProvider.GOGOANIME);
  console.log(results);

  // Search all providers
  const allResults = await searchAllProviders('Naruto');
  console.log(allResults);
}
```

### Example 2: Get Anime Info and Episodes

```typescript
import { getAnimeInfo, AnimeProvider } from './services/consumetService';

async function getInfoExample() {
  const animeId = 'naruto-shippuden';
  const info = await getAnimeInfo(animeId, AnimeProvider.GOGOANIME);

  console.log(`Title: ${info?.title}`);
  console.log(`Total Episodes: ${info?.totalEpisodes}`);
  console.log('Episodes:', info?.episodes);
}
```

### Example 3: Get Video Sources

```typescript
import { getEpisodeSources, AnimeProvider } from './services/consumetService';

async function getSourcesExample() {
  const episodeId = 'naruto-shippuden-episode-1';
  const sources = await getEpisodeSources(episodeId, AnimeProvider.GOGOANIME);

  console.log('Available sources:');
  sources?.sources.forEach(source => {
    console.log(`- ${source.quality}: ${source.url}`);
  });
}
```

### Example 4: Complete Workflow (Unified Service)

```typescript
import { unifiedAnimeService } from './services/unifiedAnimeService';

async function completeWorkflow() {
  // Search across all sources
  const results = await unifiedAnimeService.search('One Piece');

  // Get first result
  const firstAnime = results.consumet[0] || results.gogoanime[0];

  if (!firstAnime) {
    console.log('No results found');
    return;
  }

  // Get anime info
  const animeInfo = await unifiedAnimeService.getAnimeInfo(
    firstAnime.id,
    firstAnime.source
  );

  if (!animeInfo) {
    console.log('Could not get anime info');
    return;
  }

  // Get first episode sources
  const episode = animeInfo.episodes[0];
  const sources = await unifiedAnimeService.getVideoSources(
    episode.id,
    animeInfo.source
  );

  console.log(`Playing: ${animeInfo.title} - ${episode.title}`);
  console.log('Video URL:', sources[0]?.url);
}
```

### Example 5: One-Line Complete Search

```typescript
import { getCompleteAnimeData } from './services/unifiedAnimeService';

async function oneLineExample() {
  // Search, get info, get sources - all in one call
  const { anime, sources } = await getCompleteAnimeData('Attack on Titan', 1);

  if (anime && sources.length > 0) {
    console.log(`Found: ${anime.title}`);
    console.log(`Playing Episode 1: ${sources[0].url}`);
  }
}
```

---

## 🔧 Advanced Usage

### Using Improved GoGoAnime Scraper

```typescript
import { improvedGogoScraper } from './services/improvedGogoanimeScraper';

async function gogoExample() {
  // Search
  const results = await improvedGogoScraper.search('Demon Slayer');

  // Get anime info with episodes
  const info = await improvedGogoScraper.getAnimeInfo('kimetsu-no-yaiba');

  // Get episode sources
  const sources = await improvedGogoScraper.getEpisodeSources(
    'kimetsu-no-yaiba-episode-1'
  );

  // Get recent episodes
  const recent = await improvedGogoScraper.getRecentEpisodes(1);
}
```

### Using Multi-Source Manager

```typescript
import { multiSourceManager } from './services/multiSourceScraper';

async function multiSourceExample() {
  // Search all custom scrapers
  const results = await multiSourceManager.searchAll('Bleach');

  console.log('Zoro results:', results.zoro);
  console.log('AnimePahe results:', results.animePahe);
  console.log('9anime results:', results.nineAnime);

  // Get sources with fallback
  const sources = await multiSourceManager.getSourcesWithFallback(
    'bleach-id',
    1,
    'zoro'
  );
}
```

### Using Video Extractor

```typescript
import { videoExtractor } from './services/videoExtractor';

async function extractionExample() {
  // Extract from GogoPlay
  const gogoUrl = 'https://gogoplay.io/streaming.php?id=...';
  const gogoData = await videoExtractor.extract(gogoUrl);

  // Extract from Kwik (AnimePahe)
  const kwikUrl = 'https://kwik.cx/...';
  const kwikData = await videoExtractor.extract(kwikUrl);

  // Extract from RapidCloud (Zoro)
  const rapidUrl = 'https://rapid-cloud.co/...';
  const rapidData = await videoExtractor.extract(rapidUrl);

  // Extract with fallback
  const urls = [gogoUrl, kwikUrl, rapidUrl];
  const data = await videoExtractor.extractWithFallback(urls);

  console.log('Video sources:', data?.sources);
  console.log('Subtitles:', data?.subtitles);
}
```

---

## 🎬 Integration with React Native

### Example Component

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { getCompleteAnimeData } from './services/unifiedAnimeService';

export function AnimePlayer() {
  const [anime, setAnime] = useState(null);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    loadAnime();
  }, []);

  const loadAnime = async () => {
    const { anime, sources } = await getCompleteAnimeData('Naruto', 1);
    setAnime(anime);
    setSources(sources);
  };

  return (
    <View>
      <Text>{anime?.title}</Text>
      <FlatList
        data={sources}
        renderItem={({ item }) => (
          <TouchableOpacity>
            <Text>Quality: {item.quality}</Text>
            <Text>URL: {item.url}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

---

## 📊 Comparison Table

| Feature | Consumet | Multi-Source | Improved Gogo | Video Extractor | Unified |
|---------|----------|--------------|---------------|-----------------|---------|
| Multiple Providers | ✅ | ✅ | ❌ | ❌ | ✅ |
| Decryption Support | ✅ | ⚠️ Partial | ❌ | ✅ | ✅ |
| Active Maintenance | ✅ | ⚠️ Self | ⚠️ Self | ⚠️ Self | ⚠️ Self |
| Subtitles Support | ✅ | ⚠️ Limited | ❌ | ✅ | ✅ |
| Ease of Use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Reliability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## 🎯 Recommended Approach

### For Most Use Cases (Best):
```typescript
import { unifiedAnimeService } from './services/unifiedAnimeService';

// This provides:
// - Multiple providers with fallback
// - Automatic video extraction
// - Error handling
// - Simple API

const { anime, sources } = await unifiedAnimeService.getAnimeAndSources(
  'Anime Name',
  episodeNumber
);
```

### For Production Apps (Recommended):
```typescript
import { consumetService, AnimeProvider } from './services/consumetService';

// This provides:
// - Most reliable sources
// - Active maintenance
// - Best decryption support
// - Official API-like experience

const sources = await consumetService.getEpisodeSources(
  episodeId,
  AnimeProvider.GOGOANIME
);
```

### For Custom Requirements:
Mix and match services as needed:

```typescript
import { improvedGogoScraper } from './services/improvedGogoanimeScraper';
import { videoExtractor } from './services/videoExtractor';

// Custom workflow
const info = await improvedGogoScraper.getAnimeInfo(animeId);
const rawSources = await improvedGogoScraper.getEpisodeSources(episodeId);
const extractedSources = await videoExtractor.extractWithFallback(
  rawSources.map(s => s.url)
);
```

---

## ⚠️ Important Notes

### Legal Disclaimer
These tools are for **educational purposes only**. Scraping copyrighted content may violate terms of service and laws. Always:
1. Get proper permissions/licenses for production use
2. Use official APIs when available
3. Respect robots.txt
4. Follow rate limiting
5. Only use for personal learning

### Rate Limiting
Implement rate limiting to avoid overwhelming servers:

```typescript
// Built-in rate limiter
import { rateLimiter } from './services/scrapingService';

await rateLimiter.add(async () => {
  return await scrapeFunction();
});
```

### Error Handling
Always handle errors gracefully:

```typescript
try {
  const sources = await getEpisodeSources(episodeId);
  if (!sources || sources.length === 0) {
    // Show user-friendly error
    console.log('No sources available');
  }
} catch (error) {
  console.error('Error loading video:', error);
  // Provide fallback or alternative
}
```

---

## 🔄 Migration from Old Service

If you're using the old `scrapingService.ts`, here's how to migrate:

### Old Code:
```typescript
import { scrapeVideoSources } from './services/scrapingService';
const sources = await scrapeVideoSources(episodeId);
```

### New Code (Recommended):
```typescript
import { unifiedAnimeService } from './services/unifiedAnimeService';
const sources = await unifiedAnimeService.getVideoSources(episodeId);
```

---

## 📚 Additional Resources

- [Consumet Extensions Docs](https://github.com/consumet/extensions)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Crypto-JS Documentation](https://www.npmjs.com/package/crypto-js)
- [HLS Streaming Guide](https://en.wikipedia.org/wiki/HTTP_Live_Streaming)

---

## 🐛 Troubleshooting

### No search results found
- Check if the anime name is spelled correctly
- Try alternative spellings or Japanese names
- Use multiple providers with the unified service

### Video extraction fails
- Some servers change their encryption frequently
- Use the fallback methods in unified service
- Check if the episode URL is still valid

### Slow performance
- Use Consumet API instead of custom scrapers
- Implement caching for frequently accessed data
- Use the unified service which handles optimization

### CORS issues in browser
- Use a proxy service
- Implement backend API that handles scraping
- Check existing `proxyService.ts` in your project

---

## 🎉 You're All Set!

You now have **four comprehensive solutions** for anime scraping with:
- ✅ Multiple providers (GoGoAnime, Zoro, AnimePahe, 9anime)
- ✅ Proper DOM parsing with Cheerio
- ✅ Video decryption support
- ✅ Intelligent fallback mechanisms
- ✅ Easy-to-use unified API

Start with the **Unified Service** for the best experience!
