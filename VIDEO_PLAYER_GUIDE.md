# 🎬 Video Player Navigation Guide

How to properly navigate to the video player with multi-source support.

## ✅ Fixed: "No streaming sources available"

The video player now supports **4 streaming sources**. You must pass the correct parameters based on the source.

## 📝 Navigation Parameters

```typescript
navigation.navigate('VideoPlayer', {
  animeId: string;       // Required - Anime identifier
  episodeId: string;     // Required - Episode identifier
  animeTitle?: string;   // Optional - Display name
  episodeNumber?: number;// Optional - Episode number
  source?: string;       // NEW - Source name (VIU, Shafilm, Gogoanime)
  folderName?: string;   // NEW - For Shafilm episodes
  productId?: string;    // NEW - For VIU episodes
  seriesId?: string;     // NEW - For VIU series
});
```

## 🎯 Examples by Source

### 1. **Consumet/Gogoanime** (Default)

```typescript
navigation.navigate('VideoPlayer', {
  animeId: 'naruto-dub',
  episodeId: 'naruto-dub-episode-1',
  animeTitle: 'Naruto',
  episodeNumber: 1,
  // No source specified = uses Consumet by default
});
```

### 2. **Shafilm** (File Server)

```typescript
navigation.navigate('VideoPlayer', {
  animeId: 'demon-slayer',
  episodeId: 'demon-slayer-episode-1',
  animeTitle: 'Demon Slayer',
  episodeNumber: 1,
  source: 'Shafilm',              // ✅ Specify source
  folderName: 'Demon.Slayer.2019' // ✅ Required for Shafilm
});
```

### 3. **VIU** (Official Platform)

```typescript
navigation.navigate('VideoPlayer', {
  animeId: 'solo-leveling',
  episodeId: 'ep12345',
  animeTitle: 'Solo Leveling',
  episodeNumber: 1,
  source: 'VIU',           // ✅ Specify source
  productId: 'prod67890',  // ✅ Required for VIU
  seriesId: 'series12345'  // Optional but recommended
});
```

### 4. **Web Scraping** (Backup)

```typescript
navigation.navigate('VideoPlayer', {
  animeId: 'one-piece',
  episodeId: 'one-piece-episode-1',
  animeTitle: 'One Piece',
  episodeNumber: 1,
  source: 'Gogoanime', // Uses scraping fallback
});
```

## 🔄 Complete Flow Example

### From Search Results

```typescript
import { 
  searchAnimeForStreaming, 
  getShafilmEpisodes, 
  getViuAnimeEpisodes 
} from './services/streamingApi';

// 1. Search for anime
const results = await searchAnimeForStreaming('Demon Slayer');

// 2. User selects an anime
const selectedAnime = results[0]; // User's choice

// 3. Get episodes based on source
let episodes = [];

if (selectedAnime.source === 'Shafilm') {
  episodes = await getShafilmEpisodes(selectedAnime.folderName);
} else if (selectedAnime.source === 'VIU') {
  episodes = await getViuAnimeEpisodes(selectedAnime.seriesId);
} else {
  // Consumet or other sources
  const info = await getAnimeStreamingInfo(selectedAnime.id);
  episodes = info?.episodes || [];
}

// 4. User selects an episode
const selectedEpisode = episodes[0]; // User's choice

// 5. Navigate to video player with correct parameters
navigation.navigate('VideoPlayer', {
  animeId: selectedAnime.id,
  episodeId: selectedEpisode.id,
  animeTitle: selectedAnime.title,
  episodeNumber: selectedEpisode.number,
  source: selectedAnime.source,
  folderName: selectedAnime.folderName, // For Shafilm
  productId: selectedEpisode.url,       // For VIU (productId stored in url)
  seriesId: selectedAnime.seriesId,     // For VIU
});
```

## 🐛 Troubleshooting

### Error: "No streaming sources available"

**Cause:** Missing required source-specific parameters

**Fix:** Make sure you pass the correct parameters:

```typescript
// ❌ Wrong - Missing folderName for Shafilm
navigation.navigate('VideoPlayer', {
  animeId: 'demon-slayer',
  episodeId: 'ep1',
  source: 'Shafilm',
  // Missing folderName!
});

// ✅ Correct
navigation.navigate('VideoPlayer', {
  animeId: 'demon-slayer',
  episodeId: 'ep1',
  source: 'Shafilm',
  folderName: 'Demon.Slayer.2019', // ✅ Added
});
```

### Error: "Episode not found"

**Cause:** Episode ID doesn't match source format

**Fix:** Use the episode ID from the source:

```typescript
// For Shafilm
const episodes = await getShafilmEpisodes(folderName);
const episodeId = episodes[0].id; // Use this ID

// For VIU
const episodes = await getViuAnimeEpisodes(seriesId);
const productId = episodes[0].url; // VIU stores productId in url field
```

### Error: "API failed"

**Cause:** Source API is down or blocked

**Fix:** The system will automatically try fallback sources. Check console logs:

```typescript
console.log('=== Loading Streaming Sources ===');
console.log('Episode ID:', episodeId);
console.log('Source:', source || 'Default (Consumet)');
```

## 🎯 Quick Reference

| Source | Required Params | Optional Params |
|--------|----------------|-----------------|
| **Consumet** | `episodeId` | - |
| **Shafilm** | `episodeId`, `source`, `folderName` | - |
| **VIU** | `episodeId`, `source`, `productId` | `seriesId` |
| **Scraping** | `episodeId`, `source` | - |

## 💡 Best Practices

### 1. Always Store Source Info

```typescript
// When saving favorites/history
const favoriteAnime = {
  id: anime.id,
  title: anime.title,
  source: anime.source,        // ✅ Save source
  folderName: anime.folderName,// ✅ Save Shafilm data
  productId: anime.productId,  // ✅ Save VIU data
  seriesId: anime.seriesId,    // ✅ Save VIU series
};
```

### 2. Check Source Before Navigation

```typescript
const navigateToPlayer = (anime, episode) => {
  const baseParams = {
    animeId: anime.id,
    episodeId: episode.id,
    animeTitle: anime.title,
    episodeNumber: episode.number,
  };

  // Add source-specific params
  if (anime.source === 'Shafilm') {
    navigation.navigate('VideoPlayer', {
      ...baseParams,
      source: 'Shafilm',
      folderName: anime.folderName,
    });
  } else if (anime.source === 'VIU') {
    navigation.navigate('VideoPlayer', {
      ...baseParams,
      source: 'VIU',
      productId: episode.url, // VIU productId
      seriesId: anime.seriesId,
    });
  } else {
    // Consumet or other sources
    navigation.navigate('VideoPlayer', baseParams);
  }
};
```

### 3. Add Error Handling

```typescript
try {
  navigation.navigate('VideoPlayer', {
    // ... params
  });
} catch (error) {
  console.error('Navigation failed:', error);
  Alert.alert('Error', 'Could not load video player');
}
```

## 🔍 Debugging

Enable debug logs to see what's happening:

```typescript
// In VideoPlayerScreen, check console output:
console.log('=== Loading Streaming Sources ===');
console.log('Episode ID:', episodeId);
console.log('Source:', source || 'Default (Consumet)');
console.log('Folder Name:', folderName);
console.log('Product ID:', productId);
```

Look for:
- ✅ "Found sources: X" - Success!
- ❌ "No streaming sources returned" - Check parameters
- ❌ "Consumet API failed" - API might be down
- ✅ "Falling back to..." - Fallback working

## 🎬 UI Display

The video player now shows source badges:

```
┌─────────────────────────────────┐
│ Demon Slayer Kimetsu no Yaiba  │
│ Episode 1                       │
│ [1080P] [SHAFILM]              │ ← Source badges
└─────────────────────────────────┘
```

## 📱 Example: Complete Implementation

```typescript
// AnimeDetailScreen.tsx
import { 
  getShafilmEpisodes, 
  getViuAnimeEpisodes, 
  getAnimeStreamingInfo 
} from '../services/streamingApi';

const AnimeDetailScreen = ({ route, navigation }) => {
  const { anime } = route.params;
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    loadEpisodes();
  }, []);

  const loadEpisodes = async () => {
    let eps = [];
    
    if (anime.source === 'Shafilm') {
      eps = await getShafilmEpisodes(anime.folderName);
    } else if (anime.source === 'VIU') {
      eps = await getViuAnimeEpisodes(anime.seriesId);
    } else {
      const info = await getAnimeStreamingInfo(anime.id);
      eps = info?.episodes || [];
    }
    
    setEpisodes(eps);
  };

  const playEpisode = (episode) => {
    const params = {
      animeId: anime.id,
      episodeId: episode.id,
      animeTitle: anime.title,
      episodeNumber: episode.number,
    };

    // Add source-specific params
    if (anime.source === 'Shafilm') {
      params.source = 'Shafilm';
      params.folderName = anime.folderName;
    } else if (anime.source === 'VIU') {
      params.source = 'VIU';
      params.productId = episode.url; // VIU uses url field for productId
      params.seriesId = anime.seriesId;
    }

    navigation.navigate('VideoPlayer', params);
  };

  return (
    <View>
      {episodes.map(ep => (
        <TouchableOpacity 
          key={ep.id} 
          onPress={() => playEpisode(ep)}
        >
          <Text>Episode {ep.number}: {ep.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

---

**The video player is now fixed and supports all 4 sources!** 🎉

