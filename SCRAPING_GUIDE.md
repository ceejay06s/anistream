# 🕷️ Web Scraping Guide - Educational Purpose Only

## ⚠️ LEGAL DISCLAIMER

> **IMPORTANT**: This scraping functionality is provided strictly for **EDUCATIONAL PURPOSES ONLY**.
> 
> - Web scraping may violate website Terms of Service
> - Streaming copyrighted content without permission is **ILLEGAL**
> - Commercial use can result in legal action, fines, or criminal charges
> - Always respect `robots.txt` and rate limiting
> 
> **Use this code ONLY for:**
> - Learning web scraping concepts
> - Understanding HTTP requests and HTML parsing
> - Personal educational projects
> - Testing and development
> 
> **DO NOT use for:**
> - Commercial applications
> - Public distribution
> - Monetization
> - Large-scale scraping

## 📚 What's Been Implemented

### 1. **Scraping Service** (`src/services/scrapingService.ts`)

Features:
- ✅ Search anime on Gogoanime
- ✅ Extract anime information and episodes
- ✅ Parse video sources from episode pages
- ✅ Multiple scraping strategies with fallback
- ✅ Rate limiting to be respectful
- ✅ HTML parsing utilities
- ✅ M3U8 stream extraction

### 2. **Proxy Service** (`src/services/proxyService.ts`)

Features:
- ✅ CORS proxy support (free public proxies)
- ✅ Backend proxy integration
- ✅ Smart fetch with fallback logic
- ✅ HTML caching to reduce requests
- ✅ Retry mechanism
- ✅ Multiple proxy rotation

### 3. **Updated Streaming API** (`src/services/streamingApi.ts`)

Features:
- ✅ Tries Consumet API first
- ✅ Automatically falls back to scraping
- ✅ Unified interface
- ✅ Toggle scraping on/off with `USE_SCRAPING` flag

## 🚀 Setup Instructions

### Option 1: Use Public CORS Proxies (Quick Start)

No setup needed! The app will automatically use free public CORS proxies:
- https://api.allorigins.win
- https://corsproxy.io
- https://cors-anywhere.herokuapp.com

**Pros:** No setup required
**Cons:** Unreliable, slow, may have rate limits

### Option 2: Backend Proxy Server (Recommended)

Create your own proxy server for better reliability.

#### Step 1: Create Backend Server

Create a new file `backend/proxy-server.js`:

```javascript
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for your React Native app
app.use(cors({
  origin: '*', // In production, specify your app's origin
  methods: ['GET', 'POST'],
}));

// Proxy endpoint
app.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Fetch the URL
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
    });
    
    // Return the HTML
    res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch the requested URL'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📝 Usage: http://localhost:${PORT}/proxy?url=YOUR_URL`);
});
```

#### Step 2: Install Dependencies

```bash
cd backend
npm init -y
npm install express axios cors
```

#### Step 3: Start the Server

```bash
node proxy-server.js
```

#### Step 4: Update Your App

In `src/services/proxyService.ts`, update the backend URL:

```typescript
export const fetchThroughBackend = async (
  url: string, 
  backendUrl: string = 'http://YOUR_IP:3001' // Change to your IP
): Promise<string> => {
  // ... rest of the code
};
```

**Note:** Replace `YOUR_IP` with your computer's local IP (e.g., `192.168.1.100`) so your phone/emulator can access it.

### Option 3: Deploy Backend to Cloud (Production)

Deploy your proxy server to:
- **Vercel**: Serverless functions
- **Heroku**: Free tier available
- **Railway**: Easy deployment
- **DigitalOcean**: $5/month droplet

## 🎯 How It Works

### 1. **Search Flow**

```
User searches "Naruto"
    ↓
Try Consumet API
    ↓ (if fails)
Fallback to Web Scraping
    ↓
Fetch HTML via Proxy
    ↓
Parse HTML with Regex
    ↓
Return Results
```

### 2. **Video Source Flow**

```
User clicks episode
    ↓
Try Consumet API
    ↓ (if fails)
Fallback to Scraping
    ↓
Extract iframe/download URLs
    ↓
Parse M3U8 links
    ↓
Return Stream URLs
```

## 🔧 Configuration

### Toggle Scraping On/Off

In `src/services/streamingApi.ts`:

```typescript
const USE_SCRAPING = true; // Set to false to disable scraping
```

### Adjust Rate Limiting

In `src/services/scrapingService.ts`:

```typescript
class RateLimiter {
  private delayMs = 1000; // Change delay between requests (in ms)
}
```

### Configure Cache Duration

In `src/services/proxyService.ts`:

```typescript
class HTMLCache {
  private maxAge = 5 * 60 * 1000; // 5 minutes (change as needed)
}
```

## 📝 Code Examples

### Example 1: Search with Scraping

```typescript
import { searchAnimeForStreaming } from './services/streamingApi';

const results = await searchAnimeForStreaming('One Piece');
// Will try API first, then scrape if API fails
console.log(results);
```

### Example 2: Get Episodes

```typescript
import { getAnimeStreamingInfo } from './services/streamingApi';

const info = await getAnimeStreamingInfo('one-piece');
console.log('Episodes:', info.episodes);
```

### Example 3: Get Video Sources

```typescript
import { getStreamingSources } from './services/streamingApi';

const sources = await getStreamingSources('one-piece-episode-1');
console.log('Streaming URLs:', sources.sources);
```

## 🐛 Troubleshooting

### Issue: "CORS Error"

**Solution:** 
1. Use the backend proxy server (Option 2)
2. Or ensure public CORS proxies are working
3. Check your firewall settings

### Issue: "No results found"

**Solution:**
1. Website structure may have changed (update regex patterns)
2. Proxy might be blocked (try different proxy)
3. Rate limit reached (wait and retry)
4. Website is down (check manually)

### Issue: "Video won't play"

**Solution:**
1. Check if URL is valid
2. Some sources need special headers (Referer, etc.)
3. M3U8 streams require HLS player
4. Try different quality/source

### Issue: "Slow scraping"

**Solution:**
1. Use caching (already implemented)
2. Reduce rate limiting delay
3. Use backend proxy instead of public proxies
4. Cache search results locally

## 🔒 Best Practices

### 1. **Respect Rate Limits**
```typescript
// Already implemented in scrapingService.ts
await rateLimiter.add(() => yourScrapingFunction());
```

### 2. **Use Caching**
```typescript
// Already implemented in proxyService.ts
const html = await fetchWithCache(url);
```

### 3. **Handle Errors Gracefully**
```typescript
try {
  const result = await scrapeAnimeInfo(id);
} catch (error) {
  console.error('Scraping failed:', error);
  // Show user-friendly error message
}
```

### 4. **Validate Data**
```typescript
if (!sources || sources.length === 0) {
  throw new Error('No valid sources found');
}
```

### 5. **User Agent Rotation**
```typescript
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
  // Add more
];
```

## 📊 Scraping vs API Comparison

| Feature | Consumet API | Web Scraping |
|---------|--------------|--------------|
| **Speed** | ⚡ Fast | 🐌 Slower |
| **Reliability** | ✅ High | ⚠️ Medium |
| **Maintenance** | ✅ Low | ❌ High |
| **Dependencies** | ✅ None | ❌ Proxy needed |
| **Breaking Changes** | ✅ Rare | ❌ Common |
| **CORS Issues** | ✅ No | ❌ Yes |

**Recommendation:** Always try API first, use scraping only as fallback.

## 🎓 Learning Resources

### Web Scraping Concepts:
- HTML parsing with regex
- DOM traversal
- HTTP requests and headers
- CORS and same-origin policy
- Rate limiting and respectful scraping
- Data extraction patterns

### Technologies Used:
- JavaScript Regex
- Fetch API
- HTML parsing
- Proxy servers
- Caching strategies

## 🚧 Limitations

1. **Website Changes**: Sites update HTML structure frequently
2. **IP Blocking**: May get blocked if scraping too aggressively
3. **Cloudflare**: Many sites use Cloudflare (hard to scrape)
4. **Dynamic Content**: JavaScript-rendered content won't work
5. **Legal Issues**: Always respect copyright and ToS

## 🔮 Future Improvements

- [ ] Add Cloudflare bypass (requires additional libraries)
- [ ] Implement headless browser scraping (Puppeteer)
- [ ] Add more anime sites support
- [ ] Implement captcha solving
- [ ] Add download progress tracking
- [ ] Implement multi-threaded scraping

## ⚖️ Legal Alternatives

Instead of scraping, consider:

1. **Official APIs** - Crunchyroll, Funimation
2. **Legal Streaming** - Link to official platforms
3. **Metadata Only** - Use Jikan/AniList for info only
4. **User Content** - Let users provide their own videos
5. **Licensing** - Get proper rights to stream content

---

**Remember:** This code is for educational purposes. Always respect intellectual property rights and website ToS. Use responsibly! 🙏

