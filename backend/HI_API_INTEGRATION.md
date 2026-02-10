# Hi-API Integration Guide

## Test Results ✅

Based on testing, hi-api (aniwatch-api) is **mostly working**:

- ✅ **Health Check**: Working
- ✅ **Search**: Working (returns 26+ results)
- ✅ **Get Info**: Working (returns anime details)
- ✅ **Get Episodes**: Working (returns episode list)
- ⚠️ **Get Episode Sources**: Returns 500 error (may need different server/category)

## Integration Strategy

### Option 1: Use hi-api as Primary Source (Recommended)

Use hi-api for:
- Search
- Get anime info
- Get episodes list

Fallback to HTML scraping for:
- Episode sources (if hi-api fails)

### Option 2: Hybrid Approach

- Use hi-api for search only
- Use HTML scraping for everything else

## Implementation

### 1. Add hi-api Configuration

In `proxy-server.js`, add:

```javascript
// Hi-API configuration
const HI_API_URL = process.env.HI_API_URL || 'http://localhost:4000';
const HI_API_BASE_PATH = '/api/v2/hianime';
```

### 2. Update Search Endpoint

```javascript
app.get('/scrape/hianime/search', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // Try hi-api first
    try {
      const response = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/search`, {
        params: { q: query, page },
        timeout: 5000,
      });
      
      if (response.data && response.data.success && response.data.data) {
        const animes = response.data.data.animes || response.data.data.results || [];
        const results = animes.map(item => ({
          id: cleanAnimeId(item.id),
          title: item.name || item.title,
          image: item.poster || item.image,
          type: item.type || '',
          rating: item.rating || 0,
          url: item.url || `https://hianime.to/watch/${item.id}`,
        }));
        
        return res.json({ success: true, data: results });
      }
    } catch (apiError) {
      console.log('hi-api search failed, using HTML scraping...');
    }
    
    // Fallback to HTML scraping
    // ... existing HTML scraping code ...
  } catch (error) {
    // ...
  }
});
```

### 3. Update Info Endpoint

```javascript
app.get('/scrape/hianime/info', async (req, res) => {
  try {
    let { animeId } = req.query;
    animeId = cleanAnimeId(animeId);
    
    // Try hi-api first
    try {
      const response = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${animeId}`, {
        timeout: 5000,
      });
      
      if (response.data && response.data.success && response.data.data) {
        const data = response.data.data;
        
        // Get episodes separately
        let episodes = [];
        try {
          const epResponse = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${animeId}/episodes`, {
            timeout: 5000,
          });
          
          if (epResponse.data && epResponse.data.success && epResponse.data.data) {
            const epData = epResponse.data.data;
            episodes = (epData.episodes || epData.sub || []).map(ep => ({
              id: ep.id || ep.episodeId || `${animeId}?ep=${ep.number || ep.episode}`,
              number: ep.number || ep.episode || 0,
              title: ep.title || `Episode ${ep.number || ep.episode}`,
              url: `https://hianime.to/watch/${animeId}?ep=${ep.number || ep.episode}`,
            }));
          }
        } catch (epError) {
          console.log('hi-api episodes failed, will try HTML scraping...');
        }
        
        return res.json({
          success: true,
          data: {
            id: animeId,
            title: data.title || data.name,
            image: data.poster || data.image,
            description: data.description || '',
            genres: data.genres || [],
            status: data.status || '',
            released: data.released || '',
            rating: data.rating || 0,
            type: data.type || '',
            duration: data.duration || '24 min',
            totalEpisodes: episodes.length,
            episodes: episodes,
          }
        });
      }
    } catch (apiError) {
      console.log('hi-api info failed, using HTML scraping...');
    }
    
    // Fallback to HTML scraping
    // ... existing HTML scraping code ...
  } catch (error) {
    // ...
  }
});
```

## Environment Variables

Add to your `.env` or set when starting:

```bash
HI_API_URL=http://localhost:4000
```

Or when starting the proxy server:

```bash
HI_API_URL=http://localhost:4000 node proxy-server.js
```

## Testing Integration

1. Make sure hi-api is running:
   ```bash
   cd backend/hi-api
   npm start
   ```

2. Test the proxy server endpoints:
   ```bash
   # Search
   curl "http://localhost:1000/scrape/hianime/search?query=naruto"
   
   # Info
   curl "http://localhost:1000/scrape/hianime/info?animeId=road-of-naruto-18220"
   ```

## Benefits

- ✅ Faster responses (cached by hi-api)
- ✅ More reliable search
- ✅ Better episode extraction
- ✅ Fallback to HTML scraping if hi-api fails

## Known Issues

- ⚠️ Episode sources endpoint returns 500 error
  - Solution: Use HTML scraping for episode sources
  - Or try different server/category combinations

## Next Steps

1. ✅ Test hi-api (completed)
2. ⏳ Integrate into proxy-server.js
3. ⏳ Test with real requests
4. ⏳ Deploy or keep running locally
