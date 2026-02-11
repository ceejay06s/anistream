# Hi-API (aniwatch-api) Testing Guide

## Quick Start

### 1. Start the Server

Open a new terminal and run:

```bash
cd backend/hi-api
npm start
```

The server will start on **port 4000** by default.

You should see:
```
aniwatch-api at http://localhost:4000
```

### 2. Test the API

In another terminal, run:

```bash
cd backend
node test-hi-api-working.js
```

Or set a custom URL:
```bash
HI_API_URL=http://localhost:4000 node test-hi-api-working.js
```

## API Endpoints

Based on the source code, the API uses these endpoints:

### Base Path
```
/api/v2/hianime
```

### Available Endpoints

1. **Search Anime**
   ```
   GET /api/v2/hianime/search?q={query}&page={page}
   ```

2. **Get Anime Info**
   ```
   GET /api/v2/hianime/anime/{animeId}
   ```

3. **Get Episodes**
   ```
   GET /api/v2/hianime/anime/{animeId}/episodes
   ```

4. **Get Episode Sources**
   ```
   GET /api/v2/hianime/episode/sources?animeEpisodeId={id}&server={server}&category={category}
   ```
   - `server`: e.g., `hd-1` (default: VidStreaming)
   - `category`: `sub`, `dub`, or `raw` (default: `sub`)

5. **Get Episode Servers**
   ```
   GET /api/v2/hianime/episode/servers?animeEpisodeId={id}
   ```

6. **Health Check**
   ```
   GET /health
   ```
   Returns: `daijoubu`

## Example Usage

### Search
```javascript
const response = await axios.get('http://localhost:4000/api/v2/hianime/search', {
  params: { q: 'naruto' }
});
// response.data = { success: true, data: { results: [...] } }
```

### Get Info
```javascript
const response = await axios.get('http://localhost:4000/api/v2/hianime/anime/naruto');
// response.data = { success: true, data: { title, episodes, ... } }
```

### Get Episodes
```javascript
const response = await axios.get('http://localhost:4000/api/v2/hianime/anime/naruto/episodes');
// response.data = { success: true, data: { episodes: [...] } }
```

### Get Episode Sources
```javascript
const response = await axios.get('http://localhost:4000/api/v2/hianime/episode/sources', {
  params: {
    animeEpisodeId: 'naruto?ep=1',
    server: 'hd-1',
    category: 'sub'
  }
});
// response.data = { success: true, data: { sources: [...] } }
```

## Integration with Proxy Server

Once testing is successful, you can integrate it into `proxy-server.js`:

```javascript
const HI_API_URL = process.env.HI_API_URL || 'http://localhost:4000';
const HI_API_BASE_PATH = '/api/v2/hianime';

// In your endpoint:
app.get('/scrape/hianime/info', async (req, res) => {
  try {
    const { animeId } = req.query;
    
    // Try hi-api first
    try {
      const response = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${animeId}`);
      if (response.data && response.data.success) {
        return res.json(response.data);
      }
    } catch (apiError) {
      // Fallback to HTML scraping
      console.log('hi-api failed, using HTML scraping...');
    }
    
    // ... existing HTML scraping code ...
  } catch (error) {
    // ...
  }
});
```

## Troubleshooting

### Server won't start
- Check if port 4000 is already in use
- Make sure dependencies are installed: `cd hi-api && npm install`
- Check for TypeScript errors

### API returns errors
- Make sure the server is running
- Check the server logs for errors
- Verify the endpoint URLs are correct

### Episodes not found
- The aniwatch package used by hi-api might have the same issues we found earlier
- Consider using HTML scraping as fallback

## Next Steps

1. ✅ Start the server
2. ✅ Run the test script
3. ✅ Verify all endpoints work
4. ⏳ Integrate into proxy-server.js
5. ⏳ Test with real anime data
6. ⏳ Deploy or keep running locally
