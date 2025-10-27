# Anime Scraping - Quick Start Guide

## 🚀 Fastest Way to Get Started

### Option 1: Use Unified Service (Recommended)

```typescript
import { getCompleteAnimeData } from './services/unifiedAnimeService';

// One function call to get everything
const { anime, sources } = await getCompleteAnimeData('Naruto', 1);

if (anime && sources.length > 0) {
  console.log(`Title: ${anime.title}`);
  console.log(`Video URL: ${sources[0].url}`);
  console.log(`Quality: ${sources[0].quality}`);
}
```

### Option 2: Use Consumet API (Most Reliable)

```typescript
import {
  searchAnime,
  getAnimeInfo,
  getEpisodeSources,
  AnimeProvider
} from './services/consumetService';

// Step 1: Search
const results = await searchAnime('One Piece', AnimeProvider.GOGOANIME);

// Step 2: Get anime info
const anime = await getAnimeInfo(results[0].id, AnimeProvider.GOGOANIME);

// Step 3: Get video sources
const sources = await getEpisodeSources(
  anime.episodes[0].id,
  AnimeProvider.GOGOANIME
);

console.log('Video URL:', sources.sources[0].url);
```

## 📋 Available Services

| Service | File | Best For |
|---------|------|----------|
| **Unified Service** | `unifiedAnimeService.ts` | Everything with fallback |
| **Consumet API** | `consumetService.ts` | Production apps |
| **Improved GoGo** | `improvedGogoanimeScraper.ts` | GoGoAnime only |
| **Multi-Source** | `multiSourceScraper.ts` | Custom scrapers |
| **Video Extractor** | `videoExtractor.ts` | Decrypt embed URLs |

## 🎯 Common Use Cases

### Search All Sources
```typescript
import { unifiedAnimeService } from './services/unifiedAnimeService';

const results = await unifiedAnimeService.search('Attack on Titan');
console.log('Consumet:', results.consumet);
console.log('GoGoAnime:', results.gogoanime);
console.log('Multi-Source:', results.multiSource);
```

### Get Recent Episodes
```typescript
import { getGogoRecentEpisodes } from './services/improvedGogoanimeScraper';

const recent = await getGogoRecentEpisodes();
recent.forEach(ep => {
  console.log(`${ep.title} - ${ep.episode}`);
});
```

### Extract Video from Embed URL
```typescript
import { extractVideoSources } from './services/videoExtractor';

const embedUrl = 'https://gogoplay.io/streaming.php?id=...';
const video = await extractVideoSources(embedUrl);

console.log('Sources:', video.sources);
console.log('Subtitles:', video.subtitles);
```

## 🔧 Integration Examples

### React Native Component
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { getCompleteAnimeData } from './services/unifiedAnimeService';

export function AnimePlayer({ animeName, episode }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideo();
  }, []);

  const loadVideo = async () => {
    const { anime, sources } = await getCompleteAnimeData(animeName, episode);
    if (sources.length > 0) {
      setVideoUrl(sources[0].url);
    }
    setLoading(false);
  };

  if (loading) return <ActivityIndicator />;

  return (
    <View>
      <Text>Playing: {animeName} Episode {episode}</Text>
      {/* Use your video player component */}
    </View>
  );
}
```

### Simple Search Function
```typescript
async function quickSearch(query: string) {
  const results = await searchAnime(query);
  return results.map(anime => ({
    id: anime.id,
    title: anime.title,
    image: anime.image,
  }));
}
```

## ⚡ Performance Tips

1. **Cache results** to avoid repeated requests
2. **Use Consumet API** for best reliability
3. **Implement retry logic** for failed requests
4. **Rate limit** your requests (built-in rate limiter available)

## 🛠️ Troubleshooting

**No results found?**
```typescript
// Try multiple providers
const results = await searchAllProviders('Anime Name');
```

**Video won't play?**
```typescript
// Use fallback
const { sources } = await getCompleteAnimeData(name, episode);
// Try different qualities
sources.forEach(source => console.log(source.quality, source.url));
```

**Slow loading?**
```typescript
// Use specific provider instead of searching all
const sources = await getEpisodeSources(episodeId, AnimeProvider.GOGOANIME);
```

## 📚 Full Documentation

See [ANIME_SCRAPING_GUIDE.md](./ANIME_SCRAPING_GUIDE.md) for complete documentation.

## ⚠️ Legal Notice

These tools are for **educational purposes only**. Always respect copyright laws and terms of service.
