# 🚀 Proxy Server Guide - Bypass CORS for Web Browsers

## Problem

Web browsers block direct requests to external sites (CORS policy). This prevents scraping HiAnime and GoGoAnime directly from the browser.

## Solution

Use the backend proxy server to handle scraping server-side, then return JSON to the browser.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

This installs:
- `express` - Web server
- `axios` - HTTP client
- `cors` - CORS middleware
- `cheerio` - HTML parsing

### 2. Start the Proxy Server

```bash
npm start
```

Or:
```bash
node proxy-server.js
```

You should see:
```
═══════════════════════════════════════════════════════
  🚀 AniStream Proxy Server
═══════════════════════════════════════════════════════
  ✓ Server running on: http://localhost:3001
  ✓ Health check: http://localhost:3001/health
  ✓ Proxy endpoint: http://localhost:3001/proxy?url=YOUR_URL
```

### 3. Verify It's Working

Open in browser: `http://localhost:3001/health`

You should see:
```json
{
  "status": "ok",
  "service": "AniStream Proxy Server",
  "version": "1.0.0"
}
```

## 📡 API Endpoints

### General Proxy
```
GET /proxy?url=https://example.com
```
Proxies any URL (bypasses CORS)

### HiAnime Endpoints
```
GET /scrape/hianime/search?query=naruto&page=1
GET /scrape/hianime/info?animeId=jujutsu-kaisen-100
```

### GoGoAnime Endpoints
```
GET /scrape/gogoanime/search?query=naruto
GET /scrape/gogoanime/info?animeId=naruto
```

## 🔧 Configuration

### Change Port

```bash
PORT=3002 npm start
```

### Change Proxy URL in App

The app automatically uses `http://localhost:3001` by default.

To change it, set environment variable:
```bash
# In your .env file or environment
PROXY_SERVER_URL=http://your-server:3001
```

Or update in code:
- `src/services/hianimeService.ts` (line 28)
- `src/services/gogoanimeService.ts` (line 22)

## 🌐 How It Works

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Web Browser │ ──────> │ Proxy Server │ ──────> │ Anime Sites │
│ (localhost) │         │ (localhost) │         │ (external)  │
└─────────────┘         └──────────────┘         └─────────────┘
     │                         │                         │
     │ 1. Request              │ 2. Fetch HTML           │
     │    (no CORS)            │    (no CORS)            │
     │                         │                         │
     │ <─────── 4. JSON ───────│ 3. Parse & Extract      │
     │                         │    (Cheerio)            │
```

1. **Browser** makes request to proxy (same origin, no CORS)
2. **Proxy** fetches from anime sites (server-side, no CORS)
3. **Proxy** parses HTML with Cheerio
4. **Proxy** returns clean JSON to browser

## ✅ Benefits

- ✅ No CORS errors in web browsers
- ✅ Can set custom headers (User-Agent, etc.)
- ✅ Server-side HTML parsing (faster)
- ✅ Works with React Native too (optional)

## ⚠️ Important Notes

1. **Must be running**: The proxy server must be running for web browsers to work
2. **React Native**: Mobile apps don't need this (they can scrape directly)
3. **Local only**: Default is `localhost:3001` (only accessible on your machine)
4. **Production**: Deploy to cloud (Vercel, Railway, etc.) for production use

## 🐛 Troubleshooting

### "Connection refused" or "Network Error"

**Problem**: Proxy server is not running

**Solution**: 
```bash
cd backend
npm start
```

### Still getting CORS errors

**Problem**: App is not using the proxy

**Solution**: 
1. Check that `PROXY_SERVER_URL` is set correctly
2. Verify server is running: `curl http://localhost:3001/health`
3. Check browser console for proxy errors

### Port 3001 already in use

**Problem**: Another service is using port 3001

**Solution**: 
```bash
PORT=3002 npm start
```

Then update `PROXY_SERVER_URL` in your app to `http://localhost:3002`

### No results from scraping

**Problem**: Target sites may be blocking requests

**Solution**:
1. Check server logs for errors
2. Verify sites are accessible: `curl https://hianime.to`
3. Some sites may require different headers or have rate limits

## 🚀 Production Deployment

### Option 1: Vercel (Serverless)

1. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "proxy-server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "proxy-server.js"
    }
  ]
}
```

2. Deploy:
```bash
npm install -g vercel
vercel
```

### Option 2: Railway

1. Connect GitHub repo
2. Set build command: `npm install`
3. Set start command: `node proxy-server.js`
4. Deploy!

### Option 3: DigitalOcean Droplet

1. Create $5/month droplet
2. Install Node.js
3. Clone repo
4. Run with PM2:
```bash
npm install -g pm2
pm2 start proxy-server.js
pm2 save
pm2 startup
```

## 📝 Example Usage

### Test HiAnime Search

```bash
curl "http://localhost:3001/scrape/hianime/search?query=naruto"
```

### Test GoGoAnime Search

```bash
curl "http://localhost:3001/scrape/gogoanime/search?query=naruto"
```

### Test General Proxy

```bash
curl "http://localhost:3001/proxy?url=https://hianime.to"
```

## 🎯 Next Steps

1. Start the proxy server: `cd backend && npm start`
2. Refresh your web app - CORS errors should be gone!
3. The app will automatically use the proxy when in web browsers
