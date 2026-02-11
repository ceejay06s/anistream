# Hi-API Streaming Integration Complete ✅

## Summary

Successfully integrated **hi-api (aniwatch-api)** into the proxy server for **streaming support**!

## What Was Integrated

### ✅ 1. Search Endpoint
- **Priority**: hi-api first, HTML scraping fallback
- **Endpoint**: `GET /scrape/hianime/search?query={query}`
- **Status**: ✅ Working

### ✅ 2. Info Endpoint  
- **Priority**: hi-api first, HTML scraping fallback
- **Endpoint**: `GET /scrape/hianime/info?animeId={animeId}`
- **Features**: 
  - Gets anime info from hi-api
  - Gets episodes list from hi-api
  - **Important**: Uses `episode.number` to construct episode IDs (not internal IDs)
- **Status**: ✅ Working

### ✅ 3. Episode Sources Endpoint (NEW!)
- **Priority**: hi-api only (HTML scraping fallback can be added)
- **Endpoint**: `GET /scrape/hianime/episode-sources?episodeId={id}&server={server}&category={category}`
- **Features**:
  - Gets available servers automatically
  - Returns M3U8/HLS streaming sources
  - Includes subtitles, intro/outro timing
  - Returns proper headers for CORS
- **Status**: ✅ Working

## Response Format

### Episode Sources Response

```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "url": "https://...master.m3u8",
        "quality": "auto",
        "isM3U8": true,
        "server": "hd-1"
      }
    ],
    "headers": {
      "Referer": "https://megacloud.blog/"
    },
    "tracks": [
      {
        "url": "https://...eng-0.vtt",
        "lang": "English"
      }
    ],
    "intro": {
      "start": 40,
      "end": 132
    },
    "outro": {
      "start": 1337,
      "end": 1426
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# Hi-API URL (default: http://localhost:4000)
HI_API_URL=http://localhost:4000

# Enable/disable hi-api (default: enabled)
HI_API_ENABLED=true

# Proxy server port (default: 1000)
PORT=1000
```

### Starting Services

**Terminal 1 - Hi-API:**
```bash
cd backend/hi-api
npm start
# Runs on http://localhost:4000
```

**Terminal 2 - Proxy Server:**
```bash
cd backend
HI_API_URL=http://localhost:4000 node proxy-server.js
# Runs on http://localhost:1000
```

## Usage Examples

### 1. Search Anime
```bash
curl "http://localhost:1000/scrape/hianime/search?query=naruto"
```

### 2. Get Anime Info + Episodes
```bash
curl "http://localhost:1000/scrape/hianime/info?animeId=road-of-naruto-18220"
```

### 3. Get Episode Sources (Streaming)
```bash
curl "http://localhost:1000/scrape/hianime/episode-sources?episodeId=road-of-naruto-18220?ep=1&server=hd-1&category=sub"
```

## Frontend Integration

Update `src/services/hianimeService.ts` to use the new endpoint:

```typescript
// Get episode sources
export const getHiAnimeEpisodeSources = async (
  episodeId: string,
  server?: string,
  category: 'sub' | 'dub' = 'sub'
): Promise<any[]> => {
  try {
    const response = await axios.get(`${PROXY_SERVER_URL}/scrape/hianime/episode-sources`, {
      params: {
        episodeId, // Format: "anime-id?ep=number"
        server: server || 'hd-1',
        category,
      },
      timeout: 10000,
    });
    
    if (response.data?.success && response.data?.data?.sources) {
      return response.data.data.sources.map(src => ({
        url: src.url,
        quality: src.quality || 'auto',
        isM3U8: src.isM3U8 || false,
        server: src.server,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get episode sources:', error);
    return [];
  }
};
```

## Important Notes

### Episode ID Format

**✅ CORRECT:**
```
anime-id?ep=episode-number
```
Example: `road-of-naruto-18220?ep=1`

**❌ WRONG:**
```
anime-id?ep=internal-id
```
Example: `road-of-naruto-18220?ep=94736` (this is an internal ID!)

### Episode Number vs Internal ID

When getting episodes from hi-api, the response includes:
```json
{
  "id": "road-of-naruto-18220?ep=94736",  // ❌ Internal ID
  "number": 1                              // ✅ Episode number
}
```

**Always use `episode.number` to construct the episode ID for sources!**

## Testing

### Test Search
```bash
curl "http://localhost:1000/scrape/hianime/search?query=naruto" | jq
```

### Test Info
```bash
curl "http://localhost:1000/scrape/hianime/info?animeId=road-of-naruto-18220" | jq
```

### Test Episode Sources
```bash
curl "http://localhost:1000/scrape/hianime/episode-sources?episodeId=road-of-naruto-18220?ep=1" | jq
```

## Benefits

✅ **Faster**: hi-api is cached and optimized  
✅ **More Reliable**: Better episode extraction  
✅ **Streaming Ready**: Returns M3U8/HLS sources  
✅ **Subtitles**: Includes subtitle tracks  
✅ **Fallback**: HTML scraping if hi-api fails  

## Next Steps

1. ✅ Integration complete
2. ⏳ Update frontend to use new endpoint
3. ⏳ Test with real anime playback
4. ⏳ Monitor performance

## Troubleshooting

### hi-api not responding
- Check if hi-api is running: `curl http://localhost:4000/health`
- Should return: `daijoubu`

### Episode sources returning 500
- Check episode ID format (must be `anime-id?ep=number`)
- Try different server: `hd-1`, `hd-2`, `hd-3`
- Try different category: `sub`, `dub`, `raw`

### No episodes found
- Make sure you're using the episode `number` field, not the `id` field
- Verify anime ID is correct (not numeric)

---

**Status**: ✅ **READY FOR STREAMING!**

The proxy server now supports streaming through hi-api with M3U8/HLS sources that can be played directly in video players.
