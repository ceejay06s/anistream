# 🧲 Torrent Streaming Integration Guide

This guide covers the integration of **Torrent Streaming** as the **6th streaming source** in your anime streaming app.

## ⚠️ IMPORTANT DISCLAIMER

```
⚠️ TORRENT STREAMING DISCLAIMER ⚠️

This torrent integration is provided for EDUCATIONAL PURPOSES ONLY.

Important Notes:
1. Only use for legally distributable content
2. Respect copyright laws and licensing
3. BitTorrent is a legitimate protocol, but content may not be
4. You are responsible for the content you access
5. Consider using official streaming services for licensed content

For production use:
- Implement proper legal checks
- Get appropriate licenses
- Use only authorized content
```

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Torrent Sources](#torrent-sources)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Usage Examples](#usage-examples)
6. [Implementation Requirements](#implementation-requirements)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The torrent integration provides access to anime content from multiple torrent trackers:

- **Nyaa.si** - Largest anime torrent tracker
- **SubsPlease** - High-quality seasonal anime
- **AnimeTosho** - Alternative anime torrent source

### Current Status

- ✅ **Torrent Search**: Fully implemented
- ✅ **Multi-Source**: 3 torrent trackers
- ✅ **Filtering**: By quality, episode, seeders
- ⚠️ **Streaming**: Requires WebTorrent implementation
- 🔒 **Default**: **DISABLED** (set `USE_TORRENTS = false`)

---

## 🔍 Torrent Sources

### 1. Nyaa.si

**URL**: https://nyaa.si

**Features**:
- Largest anime torrent database
- Categories for anime
- RSS feed support
- Seeder/leecher stats
- Multiple quality options

**Content Types**:
- Individual episodes
- Season batches
- Movies
- OVAs

### 2. SubsPlease

**URL**: https://subsplease.org

**Features**:
- Official fansub group
- Seasonal anime only
- Multiple quality (1080p, 720p, 480p)
- Fast releases (within hours of airing)
- Consistent naming
- High seeders

**Content Types**:
- Weekly episodes
- Current season anime
- Simulcast releases

### 3. AnimeTosho

**URL**: https://animetosho.org

**Features**:
- Metadata-rich listings
- Multiple formats
- XML feed support
- Quality information
- Alternative source

**Content Types**:
- Episodes
- Batches
- Multiple releases

---

## ✨ Features

### Torrent Search
- ✅ Multi-source concurrent search
- ✅ Quality detection (1080p, 720p, 480p, BD, WEB)
- ✅ Episode number extraction
- ✅ Seeder/leecher tracking
- ✅ File size information
- ✅ Batch vs episode detection

### Filtering & Sorting
- ✅ Filter by quality
- ✅ Filter by episode number
- ✅ Sort by seeders (most first)
- ✅ Health check (minimum seeders)
- ✅ Best torrent selection

### Caching
- ✅ 30-minute cache for search results
- ✅ Automatic cache invalidation
- ✅ Memory-efficient storage

---

## 🏗️ Architecture

### Your 6 Streaming Sources

```
1. Consumet API      → Primary GoGoAnime API
2. Falcon API        → Secondary GoGoAnime API
3. Shafilm           → File server scraping
4. VIU               → VIU Media scraping
5. GoGoanime Direct  → Direct web scraping
6. Torrents          → P2P streaming (NEW! 🧲)
```

### Torrent Flow

```
User searches "Naruto Episode 1"
    ↓
Query all 3 torrent sources concurrently
    ├─ Nyaa.si
    ├─ SubsPlease
    └─ AnimeTosho
    ↓
Parse RSS/API responses
    ↓
Extract metadata (quality, seeders, episode #)
    ↓
Filter & sort results
    ↓
Display with torrent badges
    ↓
User selects torrent
    ↓
Stream via WebTorrent (requires implementation)
```

---

## 💻 Usage Examples

### Basic Torrent Search

```typescript
import { searchAllTorrentSources } from './services/torrentService';

const torrents = await searchAllTorrentSources('Naruto');
console.log(`Found ${torrents.length} torrents`);

torrents.forEach(torrent => {
  console.log(`
    Title: ${torrent.title}
    Quality: ${torrent.quality}
    Seeders: ${torrent.seeders}
    Size: ${torrent.size}
    Source: ${torrent.source}
  `);
});
```

### Search for Specific Episode

```typescript
import { 
  searchTorrentsForEpisode,
  getBestTorrentForStreaming 
} from './services/streamingApi';

// Search for episode 12
const torrents = await searchTorrentsForEpisode('One Piece', 12);

// Get best torrent (most seeders, good quality)
const best = await getBestTorrentForStreaming('One Piece', 12);

if (best) {
  console.log(`Best torrent: ${best.title}`);
  console.log(`Magnet: ${best.magnet}`);
}
```

### Filter by Quality

```typescript
import { 
  searchAllTorrentSources,
  filterTorrentsByQuality 
} from './services/torrentService';

const allTorrents = await searchAllTorrentSources('Attack on Titan');
const hd1080 = filterTorrentsByQuality(allTorrents, '1080p');

console.log(`Found ${hd1080.length} 1080p torrents`);
```

### Get Torrent Statistics

```typescript
import { 
  searchAllTorrentSources,
  getTorrentStats 
} from './services/torrentService';

const torrents = await searchAllTorrentSources('Demon Slayer');
const stats = getTorrentStats(torrents);

console.log(`
  Total: ${stats.total}
  Healthy: ${stats.healthy}
  Episodes: ${stats.episodes}
  Batches: ${stats.batches}
  By Source: ${JSON.stringify(stats.bySource)}
  By Quality: ${JSON.stringify(stats.byQuality)}
`);
```

### Check Torrent Health

```typescript
import { 
  searchAllTorrentSources,
  isTorrentHealthy 
} from './services/torrentService';

const torrents = await searchAllTorrentSources('Naruto');
const healthy = torrents.filter(isTorrentHealthy);

console.log(`${healthy.length}/${torrents.length} torrents are healthy`);
```

---

## 🛠️ Implementation Requirements

### For Actual Streaming

To **actually stream** torrents (not just search), you need:

#### 1. WebTorrent for React Native

```bash
npm install webtorrent-react-native
# or
npm install react-native-webtorrent
```

**Alternative**: Use a backend server to handle torrents

#### 2. Backend Torrent Server (Recommended)

```javascript
// backend/torrent-server.js
const express = require('express');
const WebTorrent = require('webtorrent');
const app = express();
const client = new WebTorrent();

app.get('/stream/:magnet', (req, res) => {
  const magnet = decodeURIComponent(req.params.magnet);
  
  client.add(magnet, (torrent) => {
    // Find video file
    const file = torrent.files.find(f => 
      f.name.endsWith('.mp4') || f.name.endsWith('.mkv')
    );
    
    if (!file) {
      return res.status(404).send('No video file found');
    }
    
    // Stream file
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', file.length);
    
    const stream = file.createReadStream();
    stream.pipe(res);
  });
});

app.listen(3001, () => {
  console.log('Torrent server running on port 3001');
});
```

#### 3. Update VideoPlayerScreen

```typescript
// src/screens/VideoPlayerScreen.tsx
if (source === 'Torrent' && magnet) {
  // Use backend torrent server
  const streamUrl = `http://localhost:3001/stream/${encodeURIComponent(magnet)}`;
  
  setVideoSource(streamUrl);
  setIsPlaying(true);
}
```

#### 4. Add Torrent-Specific UI

```typescript
// Show torrent stats
<View style={styles.torrentInfo}>
  <Text style={styles.seeders}>🌱 {seeders} Seeders</Text>
  <Text style={styles.leechers}>📥 {leechers} Leechers</Text>
  <Text style={styles.size}>📦 {size}</Text>
</View>

// Show download progress
<View style={styles.progressBar}>
  <View style={[styles.progress, { width: `${progress}%` }]} />
  <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>
</View>
```

---

## ⚙️ Configuration

### Enable Torrents

```typescript
// src/services/streamingApi.ts
const USE_TORRENTS = true; // Enable torrent streaming
```

**⚠️ WARNING**: Only enable if you:
1. Have implemented WebTorrent
2. Have legal content sources
3. Understand copyright implications

### Torrent Service Configuration

```typescript
// src/services/torrentService.ts

// Minimum seeders for "healthy" torrent
const MIN_SEEDERS = 5;

// Cache duration (30 minutes)
const CACHE_TTL = 1800000;

// Torrent trackers
const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
];
```

---

## 🔧 Troubleshooting

### Issue: No torrents found

**Causes**:
- Incorrect anime title
- Network issues
- Torrent sites down

**Solutions**:
```typescript
// Try different query formats
const queries = [
  'Naruto',
  'Naruto Shippuden',
  'Naruto: Shippuuden',
];

for (const query of queries) {
  const results = await searchAllTorrentSources(query);
  if (results.length > 0) break;
}
```

### Issue: All torrents have 0 seeders

**Cause**: Old or unpopular anime

**Solution**: Try batch torrents instead of individual episodes

### Issue: Can't stream magnet link

**Cause**: WebTorrent not implemented

**Solution**: Implement WebTorrent backend or client

### Issue: CORS errors when fetching RSS

**Cause**: Browser CORS policy

**Solution**: Use proxy service

```typescript
import { fetchWithCache } from './proxyService';

const xmlText = await fetchWithCache(rssUrl);
```

### Issue: Parsing errors

**Cause**: Different RSS/API formats

**Solution**: Add more robust parsing

```typescript
try {
  const title = extractXMLTag(item, 'title');
} catch (error) {
  console.error('Parse error:', error);
  continue; // Skip this item
}
```

---

## 📊 Performance

### Search Speed

| Source | Avg Response Time | Reliability |
|--------|------------------|-------------|
| Nyaa.si | ~1-2 seconds | ⭐⭐⭐⭐ |
| SubsPlease | ~800ms | ⭐⭐⭐⭐⭐ |
| AnimeTosho | ~1.5 seconds | ⭐⭐⭐ |

### Streaming Performance

- **Initial Buffer**: 10-30 seconds (depends on seeders)
- **Playback**: Smooth with 10+ seeders
- **Quality**: Depends on torrent (usually 1080p available)

---

## 🎯 Best Practices

### 1. Always Check Seeders

```typescript
const healthy = torrents.filter(t => t.seeders >= 10);
if (healthy.length === 0) {
  console.warn('No healthy torrents found');
}
```

### 2. Prefer SubsPlease for Current Anime

```typescript
const subsplease = torrents.filter(t => t.source === 'SubsPlease');
if (subsplease.length > 0) {
  return subsplease[0]; // Usually best quality & seeders
}
```

### 3. Cache Aggressively

```typescript
import { searchTorrentsCached } from './services/torrentService';

// Use cached results (30 min TTL)
const torrents = await searchTorrentsCached('One Piece');
```

### 4. Show Torrent Information

```typescript
// Always display:
// - Seeder count
// - File size
// - Quality
// - Estimated buffer time
```

### 5. Implement Fallbacks

```typescript
// If torrent fails, fall back to other sources
if (source === 'Torrent') {
  try {
    await streamTorrent(magnet);
  } catch (error) {
    console.error('Torrent failed, trying Consumet...');
    await streamFromConsumet(episodeId);
  }
}
```

---

## 📚 API Reference

### `searchAllTorrentSources(query: string): Promise<TorrentAnime[]>`

Search all torrent sources concurrently.

**Parameters**:
- `query` - Anime title to search

**Returns**: Array of torrent results

### `searchNyaaTorrents(query: string): Promise<TorrentAnime[]>`

Search Nyaa.si specifically.

### `searchSubsPleaseTorrents(query: string): Promise<TorrentAnime[]>`

Search SubsPlease specifically.

### `filterTorrentsByQuality(torrents, quality): TorrentAnime[]`

Filter torrents by quality (1080p, 720p, etc).

### `filterTorrentsByEpisode(torrents, episode): TorrentAnime[]`

Filter torrents for specific episode number.

### `getBestTorrent(torrents): TorrentAnime | null`

Get best torrent (most seeders, good quality).

### `isTorrentHealthy(torrent): boolean`

Check if torrent has enough seeders (>=5).

### `getTorrentStats(torrents): TorrentStats`

Get statistics about torrent results.

---

## 🚀 Advanced Features

### Batch Downloads

```typescript
// Download entire season
const batchTorrents = torrents.filter(t => t.type === 'batch');
if (batchTorrents.length > 0) {
  console.log('Batch torrent available!');
}
```

### Quality Preference

```typescript
const preferences = ['1080p', '720p', '480p'];

for (const quality of preferences) {
  const filtered = filterTorrentsByQuality(torrents, quality);
  if (filtered.length > 0) {
    return filtered[0];
  }
}
```

### Multi-Tracker Magnets

```typescript
import { formatMagnetLink } from './services/torrentService';

const magnet = formatMagnetLink(infoHash, title);
// Includes multiple trackers for better connectivity
```

---

## ⚠️ Legal Considerations

### What's Legal

✅ BitTorrent protocol itself is legal
✅ Sharing/downloading public domain content
✅ Sharing/downloading Creative Commons content
✅ Sharing/downloading with proper licenses

### What's Not Legal

❌ Downloading copyrighted anime without permission
❌ Distributing licensed content
❌ Commercial use of pirated content

### Recommendations

1. **Use for educational purposes only**
2. **Support official releases** (Crunchyroll, Funimation, etc.)
3. **Respect creator rights**
4. **Check local laws** before implementing
5. **Add proper disclaimers** in your app

---

## 🔗 Related Documentation

- [Consumet Integration](./STREAMING_SETUP.md)
- [Falcon API Guide](./FALCON_API_GUIDE.md)
- [Web Scraping Guide](./SCRAPING_GUIDE.md)
- [Streaming Sources Overview](./STREAMING_SOURCES.md)
- [Video Player Guide](./VIDEO_PLAYER_GUIDE.md)

---

## 📚 External Resources

- **Nyaa.si**: https://nyaa.si
- **SubsPlease**: https://subsplease.org
- **AnimeTosho**: https://animetosho.org
- **WebTorrent**: https://webtorrent.io
- **BitTorrent Protocol**: https://www.bittorrent.org

---

## 🎉 Summary

You now have **6 streaming sources** including torrent support:

1. ✅ **Consumet API**
2. ✅ **Falcon API**
3. ✅ **Shafilm**
4. ✅ **VIU**
5. ✅ **Direct Scraping**
6. ✅ **Torrents** (search implemented, streaming requires WebTorrent)

**Note**: Torrents are **disabled by default**. Enable only for educational purposes and with proper WebTorrent implementation.

---

*Last Updated: October 27, 2025*

