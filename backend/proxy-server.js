/**
 * Simple Proxy Server for AniStream App
 * 
 * This proxy server allows the React Native app to bypass CORS restrictions
 * and scrape anime websites for educational purposes.
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 * 
 * Setup:
 * 1. npm install express axios cors
 * 2. node proxy-server.js
 * 3. Server runs on http://localhost:3001
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins (configure for production)
app.use(cors({
  origin: '*', // In production, specify your app's origin
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Main proxy endpoint
 * Usage: GET /proxy?url=https://example.com
 */
app.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    // Validate URL
    if (!url) {
      return res.status(400).json({ 
        error: 'URL parameter is required',
        usage: '/proxy?url=YOUR_URL'
      });
    }
    
    // Security: Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ 
        error: 'Invalid URL format. Must start with http:// or https://'
      });
    }
    
    console.log('Fetching:', url);
    
    // Fetch the URL with proper headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000, // 15 seconds timeout
      maxRedirects: 5,
    });
    
    console.log('✓ Success:', response.status);
    
    // Set appropriate content type
    res.set('Content-Type', response.headers['content-type'] || 'text/html');
    
    // Return the content
    res.send(response.data);
    
  } catch (error) {
    console.error('✗ Proxy error:', error.message);
    
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      return res.status(error.response.status).json({
        error: 'Target server error',
        status: error.response.status,
        message: error.message,
      });
    } else if (error.request) {
      // Request made but no response
      return res.status(504).json({
        error: 'Gateway timeout',
        message: 'No response from target server',
      });
    } else {
      // Other errors
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
});

/**
 * Health check endpoint
 * Usage: GET /health
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'AniStream Proxy Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Root endpoint with usage information
 */
app.get('/', (req, res) => {
  res.json({
    service: 'AniStream Proxy Server',
    version: '1.0.0',
    endpoints: {
      proxy: {
        path: '/proxy',
        method: 'GET',
        parameters: {
          url: 'The URL to fetch (required)',
        },
        example: `/proxy?url=${encodeURIComponent('https://gogoanime3.co/search.html?keyword=naruto')}`,
      },
      health: {
        path: '/health',
        method: 'GET',
        description: 'Check server health',
      },
    },
    usage: 'This is a CORS proxy server for the AniStream app (Educational purposes only)',
  });
});

/**
 * Batch proxy endpoint (multiple URLs)
 * Usage: POST /proxy/batch with JSON body: { urls: [...] }
 */
app.post('/proxy/batch', express.json(), async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: 'URLs array is required',
        usage: '{ "urls": ["url1", "url2", ...] }',
      });
    }
    
    // Limit batch size
    if (urls.length > 10) {
      return res.status(400).json({
        error: 'Too many URLs. Maximum 10 per batch.',
      });
    }
    
    console.log(`Batch fetching ${urls.length} URLs...`);
    
    // Fetch all URLs concurrently
    const results = await Promise.allSettled(
      urls.map(url => 
        axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        })
      )
    );
    
    // Format results
    const responses = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          url: urls[index],
          success: true,
          data: result.value.data,
          status: result.value.status,
        };
      } else {
        return {
          url: urls[index],
          success: false,
          error: result.reason.message,
        };
      }
    });
    
    res.json({ results: responses });
    
  } catch (error) {
    console.error('Batch proxy error:', error);
    res.status(500).json({
      error: 'Batch request failed',
      message: error.message,
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🚀 AniStream Proxy Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✓ Server running on: http://localhost:${PORT}`);
  console.log(`  ✓ Health check: http://localhost:${PORT}/health`);
  console.log(`  ✓ Proxy endpoint: http://localhost:${PORT}/proxy?url=YOUR_URL`);
  console.log('');
  console.log('  📝 Example usage:');
  console.log(`     http://localhost:${PORT}/proxy?url=https://example.com`);
  console.log('');
  console.log('  ⚠️  Educational purposes only!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  process.exit(0);
});

