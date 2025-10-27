# Torrent Streaming Server

Backend server for streaming torrents to the AniStream mobile app.

## Quick Start

```bash
npm install
npm start
```

Server will run on `http://localhost:3001`

## Installation

```bash
npm install express webtorrent cors
```

## Usage

```bash
node torrent-server.js
```

## API Endpoints

- `GET /` - Health check
- `POST /api/torrent/add` - Add torrent
- `GET /api/torrent/stream/:infoHash/:fileIndex` - Stream video
- `GET /api/torrent/stats/:infoHash` - Get download stats
- `DELETE /api/torrent/remove/:infoHash` - Remove torrent
- `GET /api/torrent/list` - List all torrents

## Environment Variables

- `PORT` - Server port (default: 3001)

## Notes

⚠️ **EDUCATIONAL PURPOSE ONLY**

This server is for educational purposes only. Only use for legally distributable content.

## Requirements

- Node.js 14+ 
- npm or yarn

## Features

- Streaming video from torrents
- Automatic file detection (MP4, MKV, etc.)
- Range request support for seeking
- Automatic cleanup of old torrents
- CORS enabled for React Native

## Testing

Visit `http://localhost:3001` to check if server is running.

You should see:
```json
{
  "status": "running",
  "torrents": 0,
  "downloads": 0,
  "message": "Torrent streaming server is running"
}
```

## Troubleshooting

### Port already in use

Change the port:
```bash
PORT=3002 node torrent-server.js
```

### Cannot find module 'webtorrent'

Install dependencies:
```bash
npm install
```

### Network errors

Make sure your firewall allows connections on port 3001.

## Production Deployment

For production, consider:
- Using PM2 for process management
- Adding authentication
- Rate limiting
- Better error handling
- Logging
- Monitoring

Example with PM2:
```bash
npm install -g pm2
pm2 start torrent-server.js --name anistream-torrent
pm2 save
pm2 startup
```

## License

MIT

**Remember**: This is for educational purposes only!
