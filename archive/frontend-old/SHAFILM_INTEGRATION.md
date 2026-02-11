# 📁 Shafilm File Server Integration

Integration guide for [https://prime.shafilm.vip/Series%20Anime/](https://prime.shafilm.vip/Series%20Anime/)

⚠️ **EDUCATIONAL PURPOSE ONLY** - For learning about file server scraping and directory parsing.

## 🎯 What is Shafilm?

Shafilm is a file server that hosts anime series in a simple directory structure:
- Direct MP4/MKV video files
- No complex streaming setup needed
- Organized by anime series folders
- Easy to scrape and parse

## ✨ Features Implemented

### **1. Multi-Source Search** 
When you search for anime, the app now checks:
1. ✅ **Consumet API** (Gogoanime)
2. ✅ **Shafilm File Server** (Direct files)
3. ✅ **Web Scraping** (Gogoanime backup)

All sources searched **concurrently** for faster results!

### **2. Shafilm Scraper** (`src/services/shafilmScraper.ts`)

Features:
- ✅ List all anime from directory
- ✅ Search anime by title
- ✅ Get episodes for anime
- ✅ Extract episode numbers from filenames
- ✅ Detect video quality (1080p, 720p, etc.)
- ✅ Support for multiple file formats (MP4, MKV, AVI)
- ✅ Direct download/stream URLs
- ✅ File size information
- ✅ Batch fetching for efficiency

### **3. Updated Streaming API**

Now supports:
- Multi-source searching
- Source-specific episode fetching
- Direct file streaming
- Automatic fallback between sources

## 🚀 How to Use

### Example 1: Search Across All Sources

```typescript
import { searchAnimeForStreaming } from './services/streamingApi';

// Search all sources at once
const results = await searchAnimeForStreaming('Demon Slayer');

// Results include source information
results.forEach(anime => {
  console.log(`${anime.title} - Source: ${anime.source}`);
});
```

### Example 2: Get Episodes from Shafilm

```typescript
import { getShafilmEpisodes } from './services/streamingApi';

// For Shafilm anime, use folder name
const episodes = await getShafilmEpisodes('Demon.Slayer.2019');

episodes.forEach(ep => {
  console.log(`Episode ${ep.number}: ${ep.title}`);
  console.log(`Quality: ${ep.description}`); // "1080p • MP4"
});
```

### Example 3: Stream from Shafilm

```typescript
import { getStreamingSources } from './services/streamingApi';

// Pass source and folderName for Shafilm
const sources = await getStreamingSources(
  'episode-1',              // Episode ID
  'Shafilm',                // Source name
  'Demon.Slayer.2019'       // Folder name
);

// Direct MP4 URL ready to play!
const videoUrl = sources.sources[0].url;
```

## 📊 Shafilm vs Other Sources

| Feature | Shafilm | Consumet | Web Scraping |
|---------|---------|----------|--------------|
| **Speed** | ⚡ Fast | ⚡ Fast | 🐌 Slower |
| **Direct Files** | ✅ Yes | ❌ No | ❌ No |
| **Quality Info** | ✅ Clear | ⚠️ Varies | ⚠️ Varies |
| **File Size** | ✅ Shown | ❌ No | ❌ No |
| **Format** | MP4/MKV | M3U8 | M3U8/MP4 |
| **Downloads** | ✅ Easy | ⚠️ Complex | ⚠️ Complex |
| **CORS Issues** | ⚠️ Maybe | ✅ No | ❌ Yes |

## 🔧 Configuration

### Toggle Shafilm On/Off

In `src/services/streamingApi.ts`:

```typescript
const USE_SHAFILM = true; // Set to false to disable Shafilm
```

### Adjust Batch Fetching

In `src/services/shafilmScraper.ts`:

```typescript
export const batchFetchAnimeInfo = async (
  folderNames: string[], 
  maxConcurrent: number = 3 // Adjust concurrent requests
)
```

## 📝 Directory Structure

Shafilm uses a simple structure:

```
/Series Anime/
├── Demon.Slayer.2019/
│   ├── Episode.01.1080p.mp4
│   ├── Episode.02.1080p.mp4
│   └── Episode.03.1080p.mp4
├── One.Piece/
│   ├── One.Piece.E001.720p.mkv
│   ├── One.Piece.E002.720p.mkv
│   └── One.Piece.E003.720p.mkv
└── Solo.Leveling.2024/
    └── [Episodes...]
```

## 🎯 Episode Number Detection

The scraper automatically detects episode numbers from various formats:

```typescript
// Supported formats:
"Episode.01.mp4"      → Episode 1
"Ep.05.mkv"           → Episode 5
"S01E03.mp4"          → Episode 3
"Anime - 10.mp4"      → Episode 10
"Anime.15.720p.mp4"   → Episode 15
```

## 🎨 Quality Detection

Automatically detects quality from filename:

```typescript
"Episode.01.2160p.mp4"    → "4K"
"Episode.02.1080p.mkv"    → "1080p"
"Episode.03.720p.mp4"     → "720p"
"Episode.04.BluRay.mkv"   → "1080p"
"Episode.05.WEB-DL.mp4"   → "720p"
"Episode.06.mp4"          → "HD" (default)
```

## 🔍 Search Algorithm

The search is smart and flexible:

```typescript
// All these will find "Demon Slayer":
searchShafilmAnime('demon slayer')
searchShafilmAnime('Demon.Slayer')
searchShafilmAnime('kimetsu no yaiba')
searchShafilmAnime('slayer') // Partial match
```

## 💾 Caching

The scraper uses HTML caching (5 minutes) to:
- Reduce server requests
- Improve performance
- Respect rate limits
- Save bandwidth

## 🚨 Error Handling

The integration handles errors gracefully:

```typescript
// If Shafilm fails, automatically tries other sources
const results = await searchAnimeForStreaming('Naruto');
// Returns results from any working source
```

## 📱 Mobile Considerations

### Direct File Playback:
- ✅ MP4 files play natively
- ✅ MKV may need codec support
- ✅ No special player needed for MP4

### Network Usage:
- ⚠️ Files are larger than streams
- ✅ Can be downloaded for offline viewing
- ✅ Better quality than adaptive streaming

## 🎬 Integration with Video Player

The video player automatically handles Shafilm sources:

```typescript
// In VideoPlayerScreen
navigation.navigate('VideoPlayer', {
  animeId: 'demon-slayer',
  episodeId: 'demon-slayer-episode-1',
  animeTitle: 'Demon Slayer',
  episodeNumber: 1,
  source: 'Shafilm',           // New!
  folderName: 'Demon.Slayer.2019' // New!
});
```

## 🔒 Advantages of File Servers

1. **Simple Structure** - Easy to parse
2. **Direct URLs** - No complex extraction
3. **High Quality** - Usually full quality files
4. **Downloadable** - Easy to save for offline
5. **No Ads** - Clean file serving
6. **Reliable** - Less likely to break than streaming sites

## ⚠️ Limitations

1. **File Size** - Larger downloads
2. **CORS** - May need proxy for web
3. **Limited Metadata** - Only filename info
4. **Storage** - Server may have limited space
5. **Bandwidth** - High bandwidth usage

## 🛠️ Advanced Usage

### Get All Available Anime

```typescript
import { scrapeShafilmAnimeList } from './services/shafilmScraper';

const allAnime = await scrapeShafilmAnimeList();
console.log(`${allAnime.length} anime available on Shafilm`);
```

### Batch Fetch Episode Info

```typescript
import { batchFetchAnimeInfo } from './services/shafilmScraper';

const folderNames = [
  'Demon.Slayer.2019',
  'One.Piece',
  'Solo.Leveling.2024'
];

const episodesMap = await batchFetchAnimeInfo(folderNames);
episodesMap.forEach((episodes, folderName) => {
  console.log(`${folderName}: ${episodes.length} episodes`);
});
```

### Check File Format

```typescript
import { isVideoFile } from './services/shafilmScraper';

if (isVideoFile('Episode.01.mp4')) {
  console.log('This is a video file!');
}
```

## 📚 Available Anime on Shafilm

Based on the directory listing, popular anime includes:
- ✅ Demon Slayer (2019)
- ✅ One Piece
- ✅ Solo Leveling (2024)
- ✅ Black Clover
- ✅ Bleach (2004 + TYBW)
- ✅ Dragon Ball (Super, Z Kai, Daima)
- ✅ Frieren
- ✅ Spy X Family
- ✅ Blue Lock
- ✅ DanMachi
- ✅ Jujutsu Kaisen (Kaiju No. 8)
- And many more!

## 🎯 Best Practices

1. **Check Source** - Always know which source you're using
2. **Handle Fallback** - Use try-catch for errors
3. **Cache Results** - Reduce repeated requests
4. **Respect Limits** - Don't hammer the server
5. **Show Source** - Tell users where content is from

## 🚀 Future Enhancements

Potential improvements:
- [ ] Add subtitle support
- [ ] Implement resume watching
- [ ] Add download progress tracking
- [ ] Support for season folders
- [ ] Thumbnail generation
- [ ] Metadata enrichment from MAL/AniList

## ⚖️ Legal Notice

This integration is for **educational purposes** to learn about:
- File server directory parsing
- Multi-source content aggregation
- URL construction and handling
- Error handling and fallbacks

**Always respect:**
- Copyright laws
- Server bandwidth
- Terms of service
- Rate limiting

---

**Remember:** This is for learning. For production apps, always use licensed content! 🙏

