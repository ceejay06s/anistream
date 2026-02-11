/**
 * Torrent Streaming Server
 * 
 * Backend server for streaming torrents to React Native app
 * 
 * Installation:
 * npm install express webtorrent cors
 * 
 * Usage:
 * node torrent-server.js
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 */

const express = require('express');
const WebTorrent = require('webtorrent');
const cors = require('cors');
const path = require('path');

const app = express();
const client = new WebTorrent();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// Store active torrents
const activeTorrents = new Map();

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    torrents: client.torrents.length,
    downloads: activeTorrents.size,
    message: 'Torrent streaming server is running'
  });
});

/**
 * Add torrent and get info
 */
app.post('/api/torrent/add', (req, res) => {
  const { magnet } = req.body;
  
  if (!magnet) {
    return res.status(400).json({ error: 'Magnet link required' });
  }
  
  // Check if torrent already exists
  const existing = client.torrents.find(t => t.magnetURI === magnet);
  if (existing) {
    const videoFile = existing.files.find(f => isVideoFile(f.name));
    if (videoFile) {
      return res.json({
        infoHash: existing.infoHash,
        name: existing.name,
        files: existing.files.map(f => ({
          name: f.name,
          length: f.length,
          path: f.path
        })),
        videoFile: {
          name: videoFile.name,
          index: existing.files.indexOf(videoFile)
        }
      });
    }
  }
  
  // Add new torrent
  client.add(magnet, (torrent) => {
    console.log('Torrent added:', torrent.name);
    
    activeTorrents.set(torrent.infoHash, {
      torrent,
      addedAt: Date.now()
    });
    
    // Find video file
    const videoFile = torrent.files.find(f => isVideoFile(f.name));
    
    if (!videoFile) {
      return res.status(404).json({ error: 'No video file found in torrent' });
    }
    
    res.json({
      infoHash: torrent.infoHash,
      name: torrent.name,
      files: torrent.files.map(f => ({
        name: f.name,
        length: f.length,
        path: f.path
      })),
      videoFile: {
        name: videoFile.name,
        index: torrent.files.indexOf(videoFile)
      }
    });
  });
  
  // Handle errors
  client.on('error', (err) => {
    console.error('Torrent error:', err);
    res.status(500).json({ error: err.message });
  });
});

/**
 * Stream video from torrent
 */
app.get('/api/torrent/stream/:infoHash/:fileIndex', (req, res) => {
  const { infoHash, fileIndex } = req.params;
  
  const torrent = client.torrents.find(t => t.infoHash === infoHash);
  
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  const file = torrent.files[parseInt(fileIndex)];
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const range = req.headers.range;
  
  if (!range) {
    // No range, send entire file
    res.setHeader('Content-Length', file.length);
    res.setHeader('Content-Type', 'video/mp4');
    const stream = file.createReadStream();
    stream.pipe(res);
    return;
  }
  
  // Parse range
  const positions = range.replace(/bytes=/, '').split('-');
  const start = parseInt(positions[0], 10);
  const end = positions[1] ? parseInt(positions[1], 10) : file.length - 1;
  const chunkSize = (end - start) + 1;
  
  // Send partial content
  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${file.length}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': 'video/mp4'
  });
  
  const stream = file.createReadStream({ start, end });
  stream.pipe(res);
  
  stream.on('error', (err) => {
    console.error('Stream error:', err);
    res.end();
  });
});

/**
 * Get torrent stats
 */
app.get('/api/torrent/stats/:infoHash', (req, res) => {
  const { infoHash } = req.params;
  
  const torrent = client.torrents.find(t => t.infoHash === infoHash);
  
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  res.json({
    name: torrent.name,
    infoHash: torrent.infoHash,
    progress: (torrent.progress * 100).toFixed(2),
    downloadSpeed: formatBytes(torrent.downloadSpeed),
    uploadSpeed: formatBytes(torrent.uploadSpeed),
    numPeers: torrent.numPeers,
    downloaded: formatBytes(torrent.downloaded),
    uploaded: formatBytes(torrent.uploaded),
    length: formatBytes(torrent.length),
    timeRemaining: torrent.timeRemaining,
    done: torrent.done
  });
});

/**
 * Remove torrent
 */
app.delete('/api/torrent/remove/:infoHash', (req, res) => {
  const { infoHash } = req.params;
  
  const torrent = client.torrents.find(t => t.infoHash === infoHash);
  
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  torrent.destroy(() => {
    activeTorrents.delete(infoHash);
    console.log('Torrent removed:', infoHash);
    res.json({ message: 'Torrent removed' });
  });
});

/**
 * List all torrents
 */
app.get('/api/torrent/list', (req, res) => {
  const torrents = client.torrents.map(t => ({
    name: t.name,
    infoHash: t.infoHash,
    progress: (t.progress * 100).toFixed(2),
    numPeers: t.numPeers,
    downloadSpeed: formatBytes(t.downloadSpeed),
    length: formatBytes(t.length)
  }));
  
  res.json({ torrents });
});

/**
 * Check if file is a video
 */
function isVideoFile(filename) {
  const videoExtensions = [
    '.mp4', '.mkv', '.avi', '.mov', '.wmv',
    '.flv', '.webm', '.m4v', '.mpg', '.mpeg'
  ];
  const ext = path.extname(filename).toLowerCase();
  return videoExtensions.includes(ext);
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clean up old torrents (remove after 1 hour of inactivity)
 */
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  activeTorrents.forEach((data, infoHash) => {
    if (now - data.addedAt > ONE_HOUR) {
      const torrent = client.torrents.find(t => t.infoHash === infoHash);
      if (torrent) {
        console.log('Cleaning up old torrent:', torrent.name);
        torrent.destroy();
        activeTorrents.delete(infoHash);
      }
    }
  });
}, 10 * 60 * 1000); // Check every 10 minutes

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   Torrent Streaming Server                 ║
║   Port: ${PORT}                           ║
║   Status: Running                          ║
║                                            ║
║   ⚠️  EDUCATIONAL PURPOSE ONLY ⚠️          ║
╚════════════════════════════════════════════╝

Available endpoints:
  GET  /                                  - Health check
  POST /api/torrent/add                   - Add torrent
  GET  /api/torrent/stream/:hash/:index   - Stream video
  GET  /api/torrent/stats/:hash           - Get stats
  GET  /api/torrent/list                  - List torrents
  DELETE /api/torrent/remove/:hash        - Remove torrent
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  client.destroy(() => {
    console.log('All torrents removed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

