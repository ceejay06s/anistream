# 🧲 Torrent Streaming Setup Guide

## ⚠️ Current Status

✅ **Torrent Search**: Fully working  
✅ **Torrent Metadata**: Working (seeders, quality, size)  
✅ **Backend Server**: Complete implementation  
✅ **Video Player**: Updated to handle torrents  
⚠️ **Streaming**: Requires backend server to be running  

---

## 🚀 Quick Start

You have **2 options** for torrent streaming:

### Option 1: External Torrent Client (Easiest)

The app now automatically offers to open magnet links in external apps when the backend server is not running.

**No setup required!** Just click a torrent and it will ask if you want to open in your torrent client.

### Option 2: Backend Streaming Server (Best Experience)

Stream torrents directly in the app.

---

## 📦 Option 2: Backend Server Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install express webtorrent cors
```

Or use the provided package.json:

```bash
cd backend
mv torrent-package.json package.json
npm install
```

### Step 2: Start the Server

```bash
node torrent-server.js
```

You should see:

```
╔════════════════════════════════════════════╗
║   Torrent Streaming Server                 ║
║   Port: 3001                               ║
║   Status: Running                          ║
║                                            ║
║   ⚠️  EDUCATIONAL PURPOSE ONLY ⚠️          ║
╚════════════════════════════════════════════╝
```

### Step 3: Configure Server URL

If running on a different machine/IP:

Edit `src/services/torrentStreamingService.ts`:

```typescript
const TORRENT_SERVER_URL = 'http://YOUR_IP:3001';
```

For localhost (default):
```typescript
const TORRENT_SERVER_URL = 'http://localhost:3001';
```

For same network (find your local IP):
```typescript
const TORRENT_SERVER_URL = 'http://192.168.1.100:3001'; // Example
```

### Step 4: Test the Server

Visit in browser: `http://localhost:3001`

You should see:
```json
{
  "status": "running",
  "torrents": 0,
  "downloads": 0,
  "message": "Torrent streaming server is running"
}
```

---

## 🎬 How to Use

### Search for Torrents

1. Search for an anime in the Search screen
2. Results will include torrents from Nyaa, SubsPlease, and AnimeTosho
3. Torrents are labeled with 🧲 icon
4. Click on a torrent result

### Play Torrent

1. Select an episode from a torrent source
2. Click Play

**If backend server is running:**
- Video will buffer (5% minimum)
- Progress bar shows buffering status
- Video starts playing automatically

**If backend server is NOT running:**
- App shows "Server not running" error
- Automatically offers to open in external torrent client
- You can download and play in VLC/torrent app

---

## 🔧 Backend Server API

The backend server provides these endpoints:

### Health Check
```
GET http://localhost:3001/
```

### Add Torrent
```
POST http://localhost:3001/api/torrent/add
Body: { "magnet": "magnet:?xt=urn:..." }
```

### Stream Video
```
GET http://localhost:3001/api/torrent/stream/:infoHash/:fileIndex
```

### Get Stats
```
GET http://localhost:3001/api/torrent/stats/:infoHash
```

### Remove Torrent
```
DELETE http://localhost:3001/api/torrent/remove/:infoHash
```

### List Torrents
```
GET http://localhost:3001/api/torrent/list
```

---

## 📱 App Features

### Torrent Search
- ✅ Search 3 sources simultaneously (Nyaa, SubsPlease, AnimeTosho)
- ✅ Display seeders, leechers, file size
- ✅ Show quality (1080p, 720p, BD, etc.)
- ✅ Filter by episode number
- ✅ Sort by seeders

### Video Player
- ✅ Show buffering progress (percentage)
- ✅ Display seeder count and file size
- ✅ Automatic server detection
- ✅ Fallback to external apps
- ✅ Cleanup on exit

### External App Support
- ✅ Detect installed torrent clients
- ✅ Open magnet links automatically
- ✅ Show helpful error messages
- ✅ Recommend torrent apps

---

## 🐛 Troubleshooting

### Issue: "Torrent server is not running"

**Solution**: Start the backend server

```bash
cd backend
node torrent-server.js
```

### Issue: "Failed to load torrent"

**Causes**:
- Low seeders (< 2)
- Network issues
- Invalid magnet link

**Solution**: Try a different torrent with more seeders

### Issue: "Cannot connect to server"

**Cause**: Wrong server URL

**Solution**: Check your server IP in `torrentStreamingService.ts`

For local development:
```typescript
const TORRENT_SERVER_URL = 'http://localhost:3001';
```

For same network:
```typescript
// Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
const TORRENT_SERVER_URL = 'http://192.168.1.100:3001';
```

### Issue: Video buffering forever

**Causes**:
- Low seeders
- Slow connection
- Large file size

**Solutions**:
1. Wait longer (large files take time)
2. Try a smaller quality (720p instead of 1080p)
3. Check server logs for errors

### Issue: CORS errors (web only)

**Solution**: CORS is already enabled in the backend server. If still having issues, add your domain:

```javascript
// backend/torrent-server.js
app.use(cors({
  origin: 'http://localhost:19006' // Your Expo web URL
}));
```

---

## 📊 Performance Tips

### 1. Choose Torrents with Good Seeders

- ✅ 10+ seeders: Excellent
- ⚠️ 5-9 seeders: Good
- ❌ <5 seeders: Poor

### 2. Prefer SubsPlease

SubsPlease releases are:
- Consistent quality
- Fast releases
- High seeders
- Small file sizes

### 3. Buffer Time

Expected buffer times (5% before playing):
- 720p episode (~400MB): 10-30 seconds
- 1080p episode (~1.4GB): 30-90 seconds
- BD episode (~3GB+): 2-5 minutes

### 4. Server Resources

Backend server uses:
- CPU: Moderate (during download)
- RAM: ~100-500MB per torrent
- Disk: Temporary storage for buffering
- Network: Depends on seeders

---

## 🔒 Security & Legal

### ⚠️ Important Disclaimers

1. **Educational Purpose Only**: This implementation is for educational purposes
2. **Legal Content Only**: Only use for legally distributable content
3. **Copyright**: Respect copyright laws in your jurisdiction
4. **BitTorrent Protocol**: The protocol itself is legal and widely used for legitimate purposes
5. **Content Responsibility**: You are responsible for the content you access

### Best Practices

- ✅ Use for open-source anime
- ✅ Use for public domain content
- ✅ Support official releases
- ❌ Don't use for copyrighted content without permission
- ❌ Don't distribute copyrighted material

---

## 🎯 Testing

### Test with Legal Content

Test with these legal anime torrents:

1. **Big Buck Bunny** (Open source)
2. **Sintel** (Open source)
3. **Public domain anime**

Search for "Big Buck Bunny" in the app to test torrent functionality safely.

---

## 📝 Files Added/Modified

### New Files
- `backend/torrent-server.js` - Backend streaming server
- `backend/torrent-package.json` - Backend dependencies
- `src/services/torrentStreamingService.ts` - Client service
- `src/utils/torrentHelper.ts` - Helper utilities

### Modified Files
- `src/services/streamingApi.ts` - Added torrent source handling
- `src/navigation/types.ts` - Added magnet/torrent parameters
- `src/screens/VideoPlayerScreen.tsx` - Added torrent streaming logic

---

## 🚀 Next Steps

### For Development

1. ✅ Backend server is ready to use
2. ✅ Client integration is complete
3. ⚠️ Start the backend server
4. ✅ Test with legal content

### For Production

1. Deploy backend server to cloud (Heroku, DigitalOcean, AWS)
2. Use environment variables for configuration
3. Add authentication/rate limiting
4. Implement proper error tracking
5. Add analytics
6. Get proper legal clearance

---

## 📚 Additional Resources

- [WebTorrent Documentation](https://webtorrent.io/docs)
- [BitTorrent Protocol](https://www.bittorrent.org/beps/bep_0003.html)
- [Express.js](https://expressjs.com/)
- [Nyaa.si](https://nyaa.si)
- [SubsPlease](https://subsplease.org)

---

## 🎉 Summary

### What Works Right Now

✅ Torrent search across 3 sources  
✅ Display metadata (seeders, quality, size)  
✅ Backend server (complete implementation)  
✅ Video player integration  
✅ Buffering progress display  
✅ External app fallback  
✅ Automatic cleanup  

### What You Need to Do

1. **Start the backend server** (one command):
   ```bash
   cd backend && node torrent-server.js
   ```

2. **That's it!** Torrent streaming will now work.

### Alternative (No Setup)

Don't want to run a server? The app automatically falls back to opening torrents in external apps (µTorrent, Flud, etc).

---

*Last Updated: October 27, 2025*

**Remember**: This is for educational purposes only. Always respect copyright laws! 🧲

