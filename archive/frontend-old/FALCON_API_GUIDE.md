# 🦅 Falcon Anime API Integration Guide

This guide covers the integration of **Falcon Anime API** ([GitHub repo](https://github.com/falcon71181/Anime-API)) as the **5th streaming source** in your anime streaming app.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [API Endpoints](#api-endpoints)
5. [Usage Examples](#usage-examples)
6. [Caching Strategy](#caching-strategy)
7. [Integration Points](#integration-points)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Falcon Anime API is a web scraping-based API that provides:
- **GoGoAnime** content scraping
- **Aniwatch** support
- Built-in server-side caching
- Multiple quality streams
- No authentication required

### Deployment
- **API Base URL**: `https://api-anime-rouge.vercel.app`
- **Status**: Production-ready
- **Uptime**: High (Vercel hosting)
- **Rate Limits**: None specified

---

## ✨ Features

### Content Discovery
- ✅ Search anime by title
- ✅ Recent releases
- ✅ Top airing
- ✅ Popular anime
- ✅ New seasons
- ✅ Completed anime
- ✅ Anime movies
- ✅ Genre filtering

### Streaming
- ✅ Multiple quality options (360p, 480p, 720p, 1080p)
- ✅ HLS/M3U8 streams
- ✅ Direct MP4 streams
- ✅ Multiple servers
- ✅ Sub and Dub support

### Caching
- ✅ Server-side caching (1 hour to 1 month)
- ✅ Client-side caching (configurable)
- ✅ Optimized response times

---

## 🏗️ Architecture

### Multi-Source System

Your app now supports **5 concurrent streaming sources**:

```
1. Consumet API      → Primary GoGoAnime API
2. Falcon API        → Secondary GoGoAnime API with scraping (NEW!)
3. Shafilm           → File server scraping
4. VIU               → VIU Media scraping
5. GoGoanime Direct  → Direct web scraping
```

### Fallback Chain

```
Consumet API
    ↓ (fails)
Falcon API
    ↓ (fails)
Direct Scraping
    ↓ (fails)
Error handling
```

---

## 🔌 API Endpoints

### 1. Search Anime

**Endpoint**: `/gogoanime/search`

```typescript
GET https://api-anime-rouge.vercel.app/gogoanime/search?keyword=naruto&page=1
```

**Parameters**:
- `keyword` (string, required): Search query in kebab-case
- `page` (number, optional): Page number (default: 1)

**Response**:
```json
{
  "animes": [
    {
      "id": "naruto",
      "name": "Naruto",
      "img": "https://...",
      "releasedYear": "2002"
    }
  ],
  "mostPopularAnimes": [...],
  "currentPage": 1,
  "hasNextPage": true,
  "totalPages": 5
}
```

### 2. Get Anime Info

**Endpoint**: `/gogoanime/anime/:id`

```typescript
GET https://api-anime-rouge.vercel.app/gogoanime/anime/naruto
```

**Response**:
```json
{
  "id": "naruto",
  "anime_id": "naruto",
  "info": {
    "name": "Naruto",
    "img": "https://...",
    "type": "TV Series",
    "genre": ["Action", "Adventure", "Shounen"],
    "status": "Completed",
    "aired_in": 2002,
    "other_name": "ナルト",
    "episodes": 220
  }
}
```

### 3. Get Episodes

**Endpoint**: `/gogoanime/episodes/:id`

```typescript
GET https://api-anime-rouge.vercel.app/gogoanime/episodes/naruto
```

**Response**:
```json
[
  {
    "episodeId": "naruto-episode-1",
    "episodeNo": 1,
    "name": "Episode 1",
    "episodeUrl": "https://...",
    "subOrDub": "SUB"
  }
]
```

### 4. Get Streaming Sources

**Endpoint**: `/gogoanime/episode-srcs`

```typescript
GET https://api-anime-rouge.vercel.app/gogoanime/episode-srcs?id=naruto-episode-1&server=vidstreaming&category=sub
```

**Parameters**:
- `id` (string, required): Episode ID
- `server` (string, optional): Server name (default: "vidstreaming")
- `category` (string, optional): "sub" or "dub" (default: "sub")

**Response**:
```json
{
  "sources": [
    {
      "url": "https://...",
      "quality": "1080p",
      "type": "hls"
    }
  ],
  "headers": {
    "Referer": "https://gogocdn.net/"
  }
}
```

### 5. Other Endpoints

- `/gogoanime/home` - Get home page data
- `/gogoanime/recent-releases?page=1` - Recent releases
- `/gogoanime/top-airing?page=1` - Top airing anime
- `/gogoanime/popular?page=1` - Popular anime
- `/gogoanime/new-seasons?page=1` - New seasons
- `/gogoanime/completed?page=1` - Completed anime
- `/gogoanime/anime-movies?page=1` - Anime movies
- `/gogoanime/servers?id=episodeId` - Available servers

---

## 💻 Usage Examples

### Basic Search

```typescript
import { searchFalconAnime } from './services/falconApiService';

const results = await searchFalconAnime('one piece', 1);
console.log(results);
```

### Get Anime Details

```typescript
import { getFalconAnimeInfo } from './services/falconApiService';

const animeInfo = await getFalconAnimeInfo('one-piece');
console.log(animeInfo);
```

### Get Episodes

```typescript
import { getFalconEpisodes } from './services/falconApiService';

const episodes = await getFalconEpisodes('one-piece');
console.log(`Found ${episodes.length} episodes`);
```

### Get Streaming Sources

```typescript
import { getFalconStreamSources, getBestFalconSource } from './services/falconApiService';

const sources = await getFalconStreamSources('one-piece-episode-1');
const bestSource = getBestFalconSource(sources);
console.log(`Best quality: ${bestSource.quality}`);
```

### Multi-Source Search

```typescript
import { searchAnimeForStreaming } from './services/streamingApi';

// Searches all 5 sources concurrently
const results = await searchAnimeForStreaming('naruto');

// Results include source information
results.forEach(anime => {
  console.log(`${anime.title} - Source: ${anime.source}`);
});
```

### Playing Video

```typescript
// Navigate to VideoPlayerScreen with Falcon source
navigation.navigate('VideoPlayer', {
  animeId: 'naruto',
  episodeId: 'naruto-episode-1',
  animeTitle: 'Naruto',
  episodeNumber: 1,
  source: 'Falcon', // Specify Falcon as source
});
```

---

## 🗄️ Caching Strategy

### Server-Side Caching (Falcon API)

| Route | Cache Duration |
|-------|----------------|
| `/gogoanime/home` | 1 day |
| `/gogoanime/az-list` | 1 day |
| `/gogoanime/search` | 1 hour |
| `/gogoanime/anime/:id` | 1 month |
| `/gogoanime/episodes/:id` | 1 day |
| `/gogoanime/episode-srcs` | 30 minutes |
| Category routes | 1 day |

### Client-Side Caching

```typescript
import { searchFalconAnimeCached, falconApiCache } from './services/falconApiService';

// Use cached search (1 hour TTL)
const results = await searchFalconAnimeCached('naruto', 1);

// Clear cache manually
falconApiCache.clear();
```

**Custom Cache TTL**:
```typescript
// Set custom cache duration (2 hours)
falconApiCache.set('custom-key', data, 3600 * 2 * 1000);
```

---

## 🔗 Integration Points

### 1. Search Screen

The Falcon API is automatically integrated into the search functionality:

```typescript
// src/screens/SearchScreen.tsx
const results = await searchAnimeForStreaming(query);
// Returns results from all 5 sources including Falcon
```

### 2. Anime Detail Screen

Fetch episodes using Falcon API:

```typescript
// src/screens/AnimeDetailScreen.tsx
if (source === 'Falcon') {
  const episodes = await getFalconAnimeEpisodes(animeId);
}
```

### 3. Video Player Screen

Play streams from Falcon API:

```typescript
// src/screens/VideoPlayerScreen.tsx
const streamingData = await getStreamingSources(
  episodeId,
  'Falcon' // Source parameter
);
```

### 4. Home Screen

Show Falcon content on home:

```typescript
// src/screens/HomeScreen.tsx
const topAiring = await getFalconTopAiring();
const popular = await getFalconPopular();
```

---

## 🛠️ Troubleshooting

### Issue: No streaming sources found

**Solution**:
```typescript
// Try different servers
const servers = await getFalconServers(episodeId);
console.log('Available servers:', servers);

// Try each server
for (const server of servers) {
  const sources = await getFalconStreamSources(episodeId, server.name);
  if (sources.length > 0) break;
}
```

### Issue: Search returns no results

**Cause**: Query format issue

**Solution**:
```typescript
import { formatAnimeId } from './services/falconApiService';

// Format title properly
const formattedQuery = formatAnimeId('One Piece');
// Result: "one-piece"
```

### Issue: API timeout

**Cause**: Slow network or API overload

**Solution**:
```typescript
// Check API status before use
const isAvailable = await checkFalconApiStatus();
if (!isAvailable) {
  console.warn('Falcon API unavailable, using fallback');
  // Use other sources
}
```

### Issue: CORS errors (web only)

**Cause**: Browser CORS policy

**Solution**: Already handled by Falcon API (CORS enabled)

### Issue: Video won't play

**Debugging**:
```typescript
const sources = await getFalconStreamSources(episodeId);
console.log('Sources:', sources);

sources.forEach(source => {
  console.log(`Quality: ${source.quality}`);
  console.log(`Type: ${source.type}`);
  console.log(`URL: ${source.url.substring(0, 50)}...`);
});
```

---

## 📊 Performance Comparison

| Feature | Consumet | Falcon | Shafilm | VIU | Direct Scraping |
|---------|----------|--------|---------|-----|-----------------|
| Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Reliability | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Content | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Quality | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Caching | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐ |

---

## 🚀 Advanced Usage

### Batch Requests

```typescript
import { getFalconTopAiring, getFalconPopular, getFalconNewSeasons } from './services/falconApiService';

// Fetch multiple categories concurrently
const [topAiring, popular, newSeasons] = await Promise.all([
  getFalconTopAiring(1),
  getFalconPopular(1),
  getFalconNewSeasons(1)
]);
```

### Custom Cache Management

```typescript
import { falconApiCache } from './services/falconApiService';

// Prefetch and cache popular anime
const prefetchPopular = async () => {
  const popular = await getFalconPopular(1);
  falconApiCache.set('popular-anime', popular, 3600 * 24 * 1000); // 24 hours
};

// Get from cache
const cached = falconApiCache.get('popular-anime');
```

### Error Handling

```typescript
import { searchFalconAnime } from './services/falconApiService';

try {
  const results = await searchFalconAnime('naruto');
  if (results.length === 0) {
    console.log('No results found');
  }
} catch (error) {
  console.error('Falcon API error:', error);
  // Fall back to other sources
}
```

---

## 📝 Configuration

### Enable/Disable Falcon API

```typescript
// src/services/streamingApi.ts
const USE_FALCON_API = true; // Set to false to disable
```

### Source Priority

To change source priority, reorder the promises in `searchAnimeForStreaming()`:

```typescript
// Example: Prioritize Falcon over Consumet
const promises: Promise<any[]>[] = [];

// 1. Try Falcon API first
if (USE_FALCON_API) {
  promises.push(/* Falcon API call */);
}

// 2. Try Consumet API second
promises.push(/* Consumet API call */);
```

---

## ⚠️ Important Notes

1. **Educational Purpose Only**: This integration is for educational purposes only
2. **Rate Limits**: No explicit rate limits, but be respectful
3. **Content Rights**: Ensure you have proper licensing for production use
4. **Stability**: API is community-maintained and may have occasional downtime
5. **CORS**: API has CORS enabled, works in React Native and web

---

## 🔗 Related Documentation

- [Consumet Integration](./STREAMING_SETUP.md)
- [Web Scraping Guide](./SCRAPING_GUIDE.md)
- [Shafilm Integration](./SHAFILM_INTEGRATION.md)
- [VIU Integration](./VIU_INTEGRATION.md)
- [Video Player Guide](./VIDEO_PLAYER_GUIDE.md)

---

## 📚 Resources

- **GitHub Repository**: https://github.com/falcon71181/Anime-API
- **Live API**: https://api-anime-rouge.vercel.app
- **Issues**: https://github.com/falcon71181/Anime-API/issues

---

## 🎉 Summary

You now have **5 concurrent streaming sources** in your app:

1. ✅ **Consumet API** - Primary GoGoAnime API
2. ✅ **Falcon API** - Secondary GoGoAnime API with better caching
3. ✅ **Shafilm** - Direct file server access
4. ✅ **VIU** - VIU Media streams
5. ✅ **Direct Scraping** - Last resort fallback

This provides **maximum reliability** and **content availability** for your users! 🚀

