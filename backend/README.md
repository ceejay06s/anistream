# AniStream Backend Proxy Server

This backend proxy server bypasses CORS restrictions for web browsers by handling all scraping server-side.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3001`

### 3. Verify It's Running

Visit `http://localhost:3001/health` in your browser - you should see:
```json
{
  "status": "ok",
  "service": "AniStream Proxy Server",
  "version": "1.0.0"
}
```

## 📡 Available Endpoints

### General Proxy
- `GET /proxy?url=YOUR_URL` - Proxy any URL (bypasses CORS)

### HiAnime Scraping
- `GET /scrape/hianime/search?query=naruto&page=1` - Search HiAnime
- `GET /scrape/hianime/info?animeId=jujutsu-kaisen-100` - Get anime info

### GoGoAnime Scraping
- `GET /scrape/gogoanime/search?query=naruto` - Search GoGoAnime
- `GET /scrape/gogoanime/info?animeId=naruto` - Get anime info

### Health Check
- `GET /health` - Check server status

## 🔧 Configuration

### Change Port

Set the `PORT` environment variable:
```bash
PORT=3002 npm start
```

### Change Proxy URL in App

In your app, set the environment variable:
```typescript
process.env.PROXY_SERVER_URL = 'http://localhost:3001';
```

Or update the default in:
- `src/services/hianimeService.ts`
- `src/services/gogoanimeService.ts`

## 🌐 How It Works

1. **Web Browser** → Makes request to proxy server (same origin, no CORS)
2. **Proxy Server** → Fetches from anime sites (server-side, no CORS restrictions)
3. **Proxy Server** → Parses HTML with Cheerio
4. **Proxy Server** → Returns JSON to browser

## ⚠️ Important Notes

- This server must be running for web browsers to work
- React Native apps don't need this (they can scrape directly)
- The server runs on your local machine by default
- For production, deploy this to a cloud service (Vercel, Railway, etc.)

## 🐛 Troubleshooting

### Server won't start
- Make sure port 3001 is not in use
- Check that all dependencies are installed: `npm install`

### CORS errors still happening
- Make sure the proxy server is running
- Check that `PROXY_SERVER_URL` matches your server URL
- Verify the server is accessible: `curl http://localhost:3001/health`

### No results from scraping
- Check server logs for errors
- Verify the target websites are accessible
- Some sites may block automated requests
