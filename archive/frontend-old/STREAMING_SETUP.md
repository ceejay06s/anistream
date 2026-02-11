# 🎬 Streaming Setup Guide - Consumet API Integration

This guide explains how to use the [Consumet API](https://github.com/consumet/api.consumet.org) for anime streaming in your AniStream app.

## ⚠️ Important Notice

**The public Consumet API (`https://api.consumet.org`) is NO LONGER publicly available.** You MUST self-host your own instance for production use.

### Legal Disclaimer

> ⚖️ **Legal Warning**: Streaming copyrighted anime content without proper licensing is illegal in most countries. This integration is for:
> - Educational purposes only
> - Personal/portfolio projects
> - Testing and development
> 
> **DO NOT** use this for commercial purposes or public distribution without proper licensing agreements.

## 📋 What's Been Implemented

### 1. **Streaming API Service** (`src/services/streamingApi.ts`)

Provides functions to:
- ✅ Search for anime on Gogoanime
- ✅ Get anime information and episodes
- ✅ Fetch streaming sources (M3U8/MP4)
- ✅ Get multiple quality options (1080p, 720p, etc.)
- ✅ Smart quality selection

### 2. **Updated Video Player** (`src/screens/VideoPlayerScreen.tsx`)

Features:
- ✅ Real streaming from Consumet API
- ✅ Loading states with retry option
- ✅ Error handling
- ✅ Quality selection (tap HD button to cycle)
- ✅ Current quality display
- ✅ Proper video controls

### 3. **Updated Navigation Types**

Added support for passing:
- Episode ID
- Anime title
- Episode number

## 🚀 Self-Hosting Consumet API

### Option 1: Docker (Recommended)

```bash
# Pull the Docker image
docker pull riimuru/consumet-api

# Run the container
docker run -p 3000:3000 riimuru/consumet-api

# Your API will be available at http://localhost:3000
```

### Option 2: Local Installation

```bash
# Clone the repository
git clone https://github.com/consumet/api.consumet.org.git
cd api.consumet.org

# Install dependencies
npm install

# Start the server
npm start
```

### Option 3: Deploy to Cloud

**Vercel:**
1. Fork the [Consumet API repo](https://github.com/consumet/api.consumet.org)
2. Import to Vercel
3. Deploy

**Render:**
- Use the "Deploy to Render" button in the Consumet repo

**Railway:**
- Use the "Deploy on Railway" button in the Consumet repo

### Update Your Base URL

After self-hosting, update the API URL in `src/services/streamingApi.ts`:

```typescript
// Change this line:
const CONSUMET_BASE_URL = 'https://api.consumet.org';

// To your self-hosted URL:
const CONSUMET_BASE_URL = 'http://localhost:3000'; // or your deployed URL
```

## 📝 How to Use

### Step 1: Find Anime ID for Streaming

The Consumet API uses **different IDs** than Jikan/AniList. You need to search for anime first:

```typescript
import { searchAnimeForStreaming, findAnimeForStreaming } from './services/streamingApi';

// Search by title
const results = await searchAnimeForStreaming('Naruto');
// Results will have IDs like: "naruto-dub" or "naruto-shippuden"

// Or use the helper function
const animeId = await findAnimeForStreaming('One Piece');
```

### Step 2: Get Episodes

```typescript
import { getAnimeStreamingInfo } from './services/streamingApi';

const info = await getAnimeStreamingInfo('naruto-dub');
console.log(info.episodes); // List of all episodes
```

### Step 3: Navigate to Video Player

```typescript
// From your anime detail screen or episode list:
navigation.navigate('VideoPlayer', {
  animeId: 'naruto-dub',
  episodeId: 'naruto-dub-episode-1', // From the episodes list
  animeTitle: 'Naruto',
  episodeNumber: 1,
});
```

## 🎯 Example: Adding Episode List to AnimeDetailScreen

Create a button to show episodes:

```typescript
// In AnimeDetailScreen.tsx
import { useState, useEffect } from 'react';
import { getAnimeStreamingInfo, findAnimeForStreaming } from '../services/streamingApi';

const [streamingEpisodes, setStreamingEpisodes] = useState([]);
const [streamingId, setStreamingId] = useState<string | null>(null);

// Load episodes
useEffect(() => {
  const loadEpisodes = async () => {
    // Find the anime on Gogoanime
    const id = await findAnimeForStreaming(anime.title);
    if (id) {
      setStreamingId(id);
      const info = await getAnimeStreamingInfo(id);
      if (info) {
        setStreamingEpisodes(info.episodes);
      }
    }
  };
  loadEpisodes();
}, [anime.title]);

// Render episodes
{streamingEpisodes.map((episode) => (
  <TouchableOpacity
    key={episode.id}
    onPress={() => navigation.navigate('VideoPlayer', {
      animeId: streamingId,
      episodeId: episode.id,
      animeTitle: anime.title,
      episodeNumber: episode.number,
    })}
  >
    <Text>Episode {episode.number}</Text>
  </TouchableOpacity>
))}
```

## 🔧 API Endpoints Reference

### Search Anime
```
GET /anime/gogoanime/{query}
Example: GET /anime/gogoanime/naruto
```

### Get Anime Info & Episodes
```
GET /anime/gogoanime/info/{id}
Example: GET /anime/gogoanime/info/naruto-dub
```

### Get Streaming Sources
```
GET /anime/gogoanime/watch/{episodeId}
Example: GET /anime/gogoanime/watch/naruto-dub-episode-1
```

### Response Format

**Streaming Sources:**
```json
{
  "headers": {
    "Referer": "https://gogocdn.net/"
  },
  "sources": [
    {
      "url": "https://...master.m3u8",
      "quality": "1080p",
      "isM3U8": true
    },
    {
      "url": "https://...master.m3u8",
      "quality": "720p",
      "isM3U8": true
    }
  ]
}
```

## 🎮 Video Player Features

### Current Features:
- ✅ Play/Pause controls
- ✅ Quality switching (tap HD button)
- ✅ Loading states
- ✅ Error handling with retry
- ✅ Back navigation

### To Add:
- ⏭️ Next/Previous episode navigation
- 🔊 Volume controls
- ⏩ Seek controls
- 📱 Fullscreen mode
- 💾 Remember playback position

## 🐛 Troubleshooting

### Issue: "No streaming sources available"

**Solution:**
1. Check if your self-hosted API is running
2. Verify the anime ID is correct (search first)
3. Try a different episode
4. Check console logs for API errors

### Issue: Video won't play

**Solution:**
1. Check if the URL is an M3U8 stream (requires HLS support)
2. Try a different quality
3. Check network connectivity
4. Verify CORS settings on self-hosted API

### Issue: Different anime IDs

The Consumet API uses Gogoanime IDs which are different from MAL/AniList IDs:
- **MAL:** Numeric (e.g., `20`)
- **Gogoanime:** Slugified (e.g., `naruto-dub`)

**Solution:** Always search by title first to get the correct ID.

## 📚 Additional Resources

- [Consumet API Documentation](https://docs.consumet.org)
- [Consumet GitHub](https://github.com/consumet/api.consumet.org)
- [Gogoanime Provider Docs](https://docs.consumet.org/anime/gogoanime)

## 🎯 Next Steps

1. ✅ **Self-host Consumet API** (Docker recommended)
2. ✅ **Update base URL** in `streamingApi.ts`
3. ✅ **Add episode list** to AnimeDetailScreen
4. ✅ **Test streaming** with different anime
5. ✅ **Add next/previous episode** buttons
6. ✅ **Implement watchlist/history** feature

## ⚡ Quick Test

To test if everything works:

1. Start your self-hosted Consumet API
2. Update the base URL
3. Navigate to any anime
4. Click Play on the featured carousel
5. You should see the video player with real streaming!

**Note:** The current implementation navigates to VideoPlayer but you'll need to pass proper episode IDs. For testing, you can manually call:

```typescript
const info = await getAnimeStreamingInfo('naruto-dub');
const firstEpisode = info.episodes[0];
navigation.navigate('VideoPlayer', {
  animeId: 'naruto-dub',
  episodeId: firstEpisode.id,
  animeTitle: 'Naruto',
  episodeNumber: 1,
});
```

---

**Remember:** Always comply with copyright laws and use this responsibly! 🙏

