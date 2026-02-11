# 📺 VIU Media Integration

Complete guide for integrating VIU (https://www.viu.com) - Asia's leading streaming platform

⚠️ **EDUCATIONAL PURPOSE ONLY** - For learning about API scraping and multi-region streaming platforms.

## 🌏 What is VIU?

VIU is a premium Asian streaming service with:
- **Licensed Anime Content** - Legal anime streaming
- **Multi-Region Support** - Available in 16+ countries
- **HLS Streaming** - High-quality adaptive streaming
- **Mobile & Web Apps** - Cross-platform support
- **Subtitle Support** - Multiple languages
- **Free & Premium Tiers** - Freemium model

## ✨ Features Implemented

### **1. VIU Scraper** (`src/services/viuScraper.ts`)

Comprehensive VIU integration with:
- ✅ Search anime by title
- ✅ Get series information and metadata
- ✅ Extract episodes with thumbnails
- ✅ HLS stream URL extraction
- ✅ Multi-quality support
- ✅ Region-based content
- ✅ Trending anime fetching
- ✅ Category/genre support
- ✅ DRM detection

### **2. Multi-Source System**

Now supports **4 concurrent sources**:
1. **Consumet API** - Gogoanime content
2. **Shafilm** - Direct file downloads
3. **VIU** - Licensed premium streaming ⭐
4. **Web Scraping** - Backup option

## 🚀 How It Works

```
User searches for anime
        ↓
Query 4 sources simultaneously:
├─ Consumet (Gogoanime)
├─ Shafilm (File Server)
├─ VIU (Official Platform) ⭐ NEW!
└─ Web Scraping (Backup)
        ↓
Combine & deduplicate results
        ↓
Show with source labels
        ↓
Stream from selected source
```

## 📝 API Structure

### VIU API Endpoints

```
Base URL: https://www.viu.com/ott/v3

Search:     /search?keyword={query}&area_id={region}
Series:     /series/{series_id}?area_id={region}
Episodes:   /series/{series_id}/episodes
Playback:   /playback/{product_id}?area_id={region}
Trending:   /trending?area_id={region}&category=anime
Categories: /categories?area_id={region}
```

### Response Format

**Search Results:**
```json
{
  "data": {
    "series": [
      {
        "series_id": "12345",
        "product_id": "67890",
        "name": "Anime Title",
        "description": "...",
        "cover_image_url": "https://...",
        "banner_url": "https://...",
        "genres": ["Action", "Adventure"],
        "rating": "9.5",
        "release_year": "2024"
      }
    ]
  }
}
```

**Episode List:**
```json
{
  "data": {
    "episodes": [
      {
        "product_id": "ep123",
        "episode_number": 1,
        "name": "Episode Title",
        "description": "...",
        "duration": 1440,
        "cover_image_url": "https://..."
      }
    ]
  }
}
```

**Streaming URL:**
```json
{
  "data": {
    "stream": {
      "url": "https://...master.m3u8",
      "type": "hls",
      "quality": "auto",
      "drm": false,
      "qualities": [
        {"quality": "1080p", "url": "https://..."},
        {"quality": "720p", "url": "https://..."}
      ]
    }
  }
}
```

## 🎯 Usage Examples

### Example 1: Search VIU

```typescript
import { searchViuAnime } from './services/viuScraper';

const results = await searchViuAnime('Solo Leveling');

results.forEach(anime => {
  console.log(`${anime.title}`);
  console.log(`Series ID: ${anime.seriesId}`);
  console.log(`Rating: ${anime.rating}`);
  console.log(`Genres: ${anime.genres?.join(', ')}`);
});
```

### Example 2: Get Episodes

```typescript
import { getViuAnimeInfo } from './services/viuScraper';

const info = await getViuAnimeInfo('series-12345');

if (info) {
  console.log(`Anime: ${info.anime.title}`);
  console.log(`Total Episodes: ${info.episodes.length}`);
  
  info.episodes.forEach(ep => {
    console.log(`${ep.number}. ${ep.title} (${ep.duration}s)`);
  });
}
```

### Example 3: Get Stream URL

```typescript
import { getViuStreamUrl } from './services/viuScraper';

const sources = await getViuStreamUrl('product-67890');

if (sources) {
  sources.forEach(source => {
    console.log(`Quality: ${source.quality}`);
    console.log(`URL: ${source.url}`);
    console.log(`Type: ${source.type}`); // hls, dash, mp4
    console.log(`DRM: ${source.drm}`);
  });
}
```

### Example 4: Multi-Source Search

```typescript
import { searchAnimeForStreaming } from './services/streamingApi';

// Searches all 4 sources
const results = await searchAnimeForStreaming('Demon Slayer');

// Filter by source
const viuResults = results.filter(r => r.source === 'VIU');
const shafilmResults = results.filter(r => r.source === 'Shafilm');
const gogoResults = results.filter(r => r.source === 'Gogoanime');

console.log(`VIU: ${viuResults.length} results`);
console.log(`Shafilm: ${shafilmResults.length} results`);
console.log(`Gogoanime: ${gogoResults.length} results`);
```

## 🌍 Region Support

VIU operates in 16+ regions:

```typescript
import { VIU_REGIONS, getViuAnimeByRegion } from './services/viuScraper';

// Get anime for specific region
const hongKongAnime = await getViuAnimeByRegion(VIU_REGIONS.HONG_KONG);
const singaporeAnime = await getViuAnimeByRegion(VIU_REGIONS.SINGAPORE);
const globalAnime = await getViuAnimeByRegion(VIU_REGIONS.GLOBAL);
```

**Supported Regions:**
- 🌏 Global
- 🇭🇰 Hong Kong
- 🇸🇬 Singapore
- 🇲🇾 Malaysia
- 🇮🇩 Indonesia
- 🇹🇭 Thailand
- 🇵🇭 Philippines
- 🇲🇲 Myanmar
- 🇧🇭 Bahrain
- 🇪🇬 Egypt
- 🇯🇴 Jordan
- 🇰🇼 Kuwait
- 🇴🇲 Oman
- 🇶🇦 Qatar
- 🇸🇦 Saudi Arabia
- 🇦🇪 UAE

## 🔧 Configuration

### Toggle VIU On/Off

In `src/services/streamingApi.ts`:

```typescript
const USE_VIU = true; // Set to false to disable VIU
```

### Set Default Region

In `src/services/viuScraper.ts`:

```typescript
// Change area_id parameter
const searchUrl = `${VIU_API_URL}/v3/search?area_id=1`; // 1 = Global
```

## 📊 VIU vs Other Sources

| Feature | VIU | Consumet | Shafilm | Scraping |
|---------|-----|----------|---------|----------|
| **Legal** | ✅ Yes | ⚠️ Varies | ⚠️ Varies | ❌ No |
| **Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Subtitles** | ✅ Multi-language | ⚠️ Limited | ❌ No | ⚠️ Varies |
| **Speed** | ⚡ Fast | ⚡ Fast | ⚡ Fast | 🐌 Slower |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **DRM** | ⚠️ Some content | ❌ No | ❌ No | ⚠️ Varies |
| **Regional** | ✅ Yes | ❌ No | ❌ No | ⚠️ Varies |
| **Mobile** | ✅ Optimized | ✅ Yes | ⚠️ Large files | ✅ Yes |

## 🎬 Stream Types

### HLS (HTTP Live Streaming)
- Adaptive bitrate streaming
- Best for mobile devices
- Supports multiple qualities
- URL format: `*.m3u8`

### DASH (Dynamic Adaptive Streaming)
- Similar to HLS
- Better for web browsers
- URL format: `*.mpd`

### MP4 (Direct Files)
- Direct download/stream
- Fixed quality
- Larger file sizes
- Best for offline

## ⚠️ Important Notes

### DRM Protection

Some VIU content uses DRM (Digital Rights Management):

```typescript
const sources = await getViuStreamUrl(productId);

sources?.forEach(source => {
  if (source.drm) {
    console.log('⚠️ This content is DRM-protected');
    // May require special player or license key
  }
});
```

### Authentication

VIU may require authentication for:
- Premium content
- Some regions
- Higher quality streams

### Rate Limiting

VIU has rate limits:
- Use caching (already implemented)
- Respect delays between requests
- Don't hammer the API

## 🎯 Advantages of VIU

1. **Legal Content** - Licensed anime streaming
2. **High Quality** - Professional encoding
3. **Subtitles** - Multiple languages
4. **Metadata** - Rich episode information
5. **Thumbnails** - Preview images
6. **Mobile Optimized** - HLS streaming
7. **Regional Content** - Asia-specific anime
8. **Reliable** - Professional infrastructure

## 🔒 Legal Considerations

VIU is a **legal streaming platform**:
- ✅ Licensed content distribution
- ✅ Rights holders are compensated
- ✅ Official subtitles and translations
- ⚠️ May have regional restrictions
- ⚠️ Some content requires subscription

**For your app:**
- Consider VIU partnership for legal content
- Or use as data source with proper attribution
- Respect VIU's Terms of Service
- Don't bypass premium/subscription requirements

## 🛠️ Advanced Features

### Check Availability

```typescript
import { checkViuAvailability } from './services/viuScraper';

const isAvailable = await checkViuAvailability();
if (isAvailable) {
  console.log('✅ VIU is available in your region');
} else {
  console.log('❌ VIU is not available');
}
```

### Get Trending Anime

```typescript
import { getViuTrending } from './services/viuScraper';

const trending = await getViuTrending();
console.log('Trending on VIU:');
trending.forEach((anime, i) => {
  console.log(`${i + 1}. ${anime.title} (${anime.rating}⭐)`);
});
```

### Get Categories

```typescript
import { getViuCategories } from './services/viuScraper';

const categories = await getViuCategories();
console.log('Available categories:', categories.join(', '));
```

## 📱 Mobile Optimization

VIU streams are optimized for mobile:
- Adaptive bitrate (auto-adjusts quality)
- Lower bandwidth on slow connections
- Supports background playback
- Offline download (premium)

## 🚀 Integration Tips

1. **Prefer VIU for Legal Content**
   - Show VIU results first
   - Mark as "Official"
   - Better user experience

2. **Use as Primary Source**
   ```typescript
   // Prioritize VIU in search results
   results.sort((a, b) => {
     if (a.source === 'VIU') return -1;
     if (b.source === 'VIU') return 1;
     return 0;
   });
   ```

3. **Fallback Chain**
   ```
   VIU → Consumet → Shafilm → Scraping
   ```

4. **Cache Aggressively**
   - VIU data changes less frequently
   - Reduce API calls
   - Better performance

## 🎯 Next Steps

1. ✅ **Test VIU Integration**
   - Search for popular anime
   - Verify episodes load
   - Test streaming

2. ✅ **Add Region Selector**
   - Let users choose region
   - Show region-specific content

3. ✅ **Implement Favorites**
   - Save VIU series IDs
   - Quick access to favorites

4. ✅ **Add Download Feature**
   - For premium VIU content
   - Offline viewing

## ⚖️ Legal Notice

VIU integration is for **educational purposes** to learn:
- API integration
- Multi-source content aggregation
- Stream URL extraction
- Regional content handling

**For production:**
- Contact VIU for official API access
- Get proper licensing agreements
- Respect copyright and ToS
- Consider partnership opportunities

---

**Your app now has 4 streaming sources with VIU as the premium legal option!** 🎬✨

