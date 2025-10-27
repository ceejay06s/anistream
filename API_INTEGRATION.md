# API Integration Guide

## 🌐 Real Data Sources

Your AniStream app now fetches **real anime data** from legitimate APIs instead of mock data!

### APIs Integrated

1. **Jikan API** (MyAnimeList Unofficial)
   - URL: https://api.jikan.moe/v4
   - ✅ No authentication required
   - ✅ Free to use
   - ✅ Rich anime metadata
   - ✅ High-quality images
   - 📊 Rate limit: 3 requests/second, 60 requests/minute

2. **AniList GraphQL API**
   - URL: https://graphql.anilist.co
   - ✅ No authentication for read operations
   - ✅ Free to use
   - ✅ Modern GraphQL interface
   - ✅ Trending anime data
   - ✅ High-resolution banner images

## 📁 Files Created

### `src/services/api.ts`
Contains all API integration functions:

#### Available Functions:

```typescript
// Fetch top-rated anime
fetchTopAnime(page: number, limit: number): Promise<Anime[]>

// Search anime by query
searchAnime(query: string): Promise<Anime[]>

// Fetch anime by genre ID
fetchAnimeByGenre(genreId: number, page: number): Promise<Anime[]>

// Fetch anime details by ID
fetchAnimeById(id: string): Promise<Anime | null>

// Fetch current seasonal anime
fetchSeasonalAnime(): Promise<Anime[]>

// Fetch trending anime (from AniList)
fetchTrendingAnime(): Promise<Anime[]>
```

### `src/hooks/useAnimeData.ts`
Custom React hooks for data management:

#### `useAnimeData()`
Fetches and manages anime data with categories:
```typescript
const { 
  loading,           // Loading state
  error,             // Error message
  topAnime,          // Top-rated anime
  trendingAnime,     // Trending anime
  seasonalAnime,     // Current season anime
  categories,        // Category arrays
  refresh            // Refresh function
} = useAnimeData();
```

#### `useAnimeSearch()`
Manages search functionality:
```typescript
const { 
  loading,    // Loading state
  results,    // Search results
  error,      // Error message
  search      // Search function
} = useAnimeSearch();
```

## 🔄 How It Works

### Home Screen
1. On load, fetches data from multiple sources
2. Creates categories from fetched data
3. Displays featured anime (first trending anime)
4. Shows category rows with real anime
5. **Pull-to-refresh** to reload data

### Search Screen
1. Uses **debounced search** (500ms delay)
2. Searches as you type
3. Fetches results from Jikan API
4. Displays results in grid format

### Anime Detail Screen
1. Fetches full anime details by ID
2. Shows high-quality images
3. Displays complete metadata
4. Shows episode list

### Browse Screen
Currently uses cached data, but can be updated to:
- Fetch anime by genre using `fetchAnimeByGenre()`
- Filter by specific genre IDs

## 🎯 Data Retrieved

### From Jikan API (MyAnimeList):
- ✅ Anime titles
- ✅ Cover images (JPG, large resolution)
- ✅ Synopsis/descriptions
- ✅ Episode count
- ✅ Ratings (1-10 scale)
- ✅ Release year
- ✅ Genres
- ✅ Status (Airing/Finished)
- ✅ Duration per episode
- ✅ Studio information

### From AniList:
- ✅ Trending anime rankings
- ✅ High-resolution banner images
- ✅ Average scores
- ✅ Seasonal information
- ✅ Rich descriptions

## 📊 Genre IDs (Jikan API)

```typescript
const GENRE_MAP = {
  'Action': 1,
  'Adventure': 2,
  'Comedy': 4,
  'Drama': 8,
  'Fantasy': 10,
  'Horror': 14,
  'Mystery': 7,
  'Supernatural': 37,
  'Romance': 22,
  'Sci-Fi': 24,
  'Slice of Life': 36,
  'Sports': 30,
  'Thriller': 41,
};
```

## 🚀 Usage Examples

### Example 1: Fetch Top Anime
```typescript
import { fetchTopAnime } from '../services/api';

const loadTopAnime = async () => {
  const anime = await fetchTopAnime(1, 20);
  console.log(anime); // Array of 20 top anime
};
```

### Example 2: Search Anime
```typescript
import { searchAnime } from '../services/api';

const searchNaruto = async () => {
  const results = await searchAnime('Naruto');
  console.log(results); // Array of Naruto-related anime
};
```

### Example 3: Using the Hook
```typescript
import { useAnimeData } from '../hooks/useAnimeData';

const MyComponent = () => {
  const { loading, categories, refresh } = useAnimeData();
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <ScrollView onRefresh={refresh}>
      {categories.map(cat => <CategoryRow category={cat} />)}
    </ScrollView>
  );
};
```

### Example 4: Fetch by Genre
```typescript
import { fetchAnimeByGenre, GENRE_MAP } from '../services/api';

const loadActionAnime = async () => {
  const actionAnime = await fetchAnimeByGenre(GENRE_MAP['Action']);
  console.log(actionAnime); // Array of action anime
};
```

## ⚡ Rate Limiting

### Jikan API Limits:
- **3 requests per second**
- **60 requests per minute**

### Best Practices:
1. Cache responses when possible
2. Use debouncing for search (already implemented)
3. Implement pagination for large lists
4. Don't make requests on every keystroke

### Handling Rate Limits:
```typescript
// Already implemented in api.ts
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Use between requests if needed
await sleep(1000); // Wait 1 second
```

## 🔧 Customization

### Add More Data Sources

#### Option 1: Kitsu API
```typescript
const KITSU_BASE_URL = 'https://kitsu.io/api/edge';

export const fetchFromKitsu = async () => {
  const response = await fetch(`${KITSU_BASE_URL}/anime?page[limit]=20`);
  const data = await response.json();
  return data.data.map(/* transform data */);
};
```

#### Option 2: TMDB (The Movie Database)
```typescript
// Requires API key (free)
const TMDB_API_KEY = 'your_api_key';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
```

### Update Browse Screen with Real Data

In `src/screens/BrowseScreen.tsx`:
```typescript
import { fetchAnimeByGenre, GENRE_MAP } from '../services/api';

const BrowseScreen = () => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  
  useEffect(() => {
    if (selectedGenre !== 'All') {
      fetchAnimeByGenre(GENRE_MAP[selectedGenre]).then(setAnimes);
    }
  }, [selectedGenre]);
  
  // ... rest of component
};
```

## 🎨 Image Quality

### Available Image Sizes:

**Jikan (MyAnimeList):**
- `images.jpg.image_url` - Standard quality
- `images.jpg.large_image_url` - Large quality (used in app)
- `images.jpg.small_image_url` - Thumbnail

**AniList:**
- `coverImage.large` - Large cover
- `coverImage.extraLarge` - Extra large cover (used in app)
- `bannerImage` - Wide banner image

## 📱 Offline Support (Future Enhancement)

To add offline support:

1. Install AsyncStorage:
```bash
npx expo install @react-native-async-storage/async-storage
```

2. Cache API responses:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const cacheData = async (key: string, data: any) => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};

const getCachedData = async (key: string) => {
  const cached = await AsyncStorage.getItem(key);
  return cached ? JSON.parse(cached) : null;
};
```

## 🔐 Authentication (For Future Features)

Some features require authentication:

### AniList OAuth:
```typescript
// Register app at: https://anilist.co/settings/developer
const ANILIST_CLIENT_ID = 'your_client_id';
const ANILIST_REDIRECT_URI = 'your_redirect_uri';
```

### MyAnimeList OAuth:
```typescript
// Register app at: https://myanimelist.net/apiconfig
const MAL_CLIENT_ID = 'your_client_id';
```

## 📈 Performance Optimization

### Already Implemented:
✅ Debounced search (500ms)
✅ Proper error handling
✅ Loading states
✅ Pull-to-refresh

### Future Improvements:
- [ ] Implement caching with AsyncStorage
- [ ] Add pagination for infinite scroll
- [ ] Preload images for smoother scrolling
- [ ] Implement virtual lists for large datasets

## 🧪 Testing the Integration

### Test Search:
1. Open the app
2. Go to Search tab
3. Type "Naruto" or "One Piece"
4. See real results from MyAnimeList!

### Test Home Screen:
1. Open the app
2. Wait for loading
3. See real trending anime
4. Pull down to refresh

### Test Anime Details:
1. Tap any anime card
2. See full details from the API
3. High-quality images loaded

## 📚 API Documentation Links

- **Jikan API Docs**: https://docs.api.jikan.moe/
- **AniList API Docs**: https://anilist.gitbook.io/anilist-apiv2-docs/
- **MyAnimeList API**: https://myanimelist.net/apiconfig/references/api/v2

## 💡 Pro Tips

1. **Always handle errors** - APIs can fail
2. **Show loading states** - Better UX
3. **Cache aggressively** - Reduce API calls
4. **Respect rate limits** - Don't get blocked
5. **Use TypeScript** - Type safety for API responses

## 🎉 What's New

Before: Mock data with placeholder images ❌
After: Real anime data with actual images ✅

Before: Static search results ❌
After: Live search with real results ✅

Before: 10 hardcoded anime ❌
After: Thousands of anime from MyAnimeList ✅

---

Your app now has access to **real anime data from legitimate sources**! 🚀

