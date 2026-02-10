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
const cheerio = require('cheerio');

// Try to load aniwatch package for better episode extraction
let HiAnime = null;
try {
  const aniwatch = require('aniwatch');
  HiAnime = aniwatch?.HiAnime;
  if (HiAnime) {
    console.log('✅ aniwatch package loaded successfully');
  }
} catch (error) {
  console.warn('⚠️ aniwatch package not available, using HTML scraping fallback');
}

const app = express();
const PORT = process.env.PORT || 1000;

// Hi-API (aniwatch-api) configuration
const HI_API_URL = process.env.HI_API_URL || 'http://localhost:4000';
const HI_API_BASE_PATH = '/api/v2/hianime';
const HI_API_ENABLED = process.env.HI_API_ENABLED !== 'false'; // Default: enabled

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
 * Get custom headers for megacloud.blog requests
 * These headers are required for proper stream data retrieval from megacloud embed endpoints
 */
const getMegacloudHeaders = (url) => {
  const isMegacloud = url && (url.includes('megacloud.blog') || url.includes('megacloud'));
  
  if (!isMegacloud) {
    return null;
  }
  
  // Custom headers for megacloud.blog embed requests
  return {
    'Authority': 'megacloud.blog',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-PH,en;q=0.9,fil-PH;q=0.8,fil;q=0.7,en-US;q=0.6,ja;q=0.5',
    'Cache-Control': 'no-cache',
    'DNT': '1',
    'Pragma': 'no-cache',
    'Priority': 'u=0, i',
    'Referer': 'https://hianime.to/',
    'sec-fetch-dest': 'iframe',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'cross-site',
    'sec-fetch-storage-access': 'active',
    'upgrade-insecure-requests': '1',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    'Content-Type': 'application/json',
  };
};

/**
 * Clean anime ID by removing numeric suffixes (e.g., "hoshi-no-umi-no-amuri-8552" -> "hoshi-no-umi-no-amuri")
 * This ensures we use the base slug without the numeric ID suffix
 * 
 * Handles URLs like:
 * - "watch/jack-of-all-trades-party-of-none-20333" -> "jack-of-all-trades-party-of-none"
 * - "watch/jack-of-all-trades-party-of-none-20333?w=latest&ep=164153" -> "jack-of-all-trades-party-of-none"
 * - "/watch/hoshi-no-umi-no-amuri-8552" -> "hoshi-no-umi-no-amuri"
 */
const cleanAnimeId = (animeId) => {
  if (!animeId) return animeId;
  
  // Remove leading/trailing slashes and 'watch/' prefix
  let cleaned = String(animeId).trim();
  
  // Remove query parameters if present (e.g., "?w=latest&ep=164153")
  cleaned = cleaned.split('?')[0];
  
  cleaned = cleaned.replace(/^\/+|\/+$/g, '');
  cleaned = cleaned.replace(/^watch\//, '');
  
  // Remove numeric suffix at the end (e.g., "-8552", "-12345", "-20333")
  // Pattern: one or more digits preceded by a hyphen at the end of the string
  // This handles cases like "jack-of-all-trades-party-of-none-20333" -> "jack-of-all-trades-party-of-none"
  cleaned = cleaned.replace(/-\d+$/, '');
  
  return cleaned;
};

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
    
    // Check if this is a megacloud request and get custom headers
    const megacloudHeaders = getMegacloudHeaders(url);
    
    // Build headers - use megacloud custom headers if available, otherwise use defaults
    let requestHeaders = {};
    if (megacloudHeaders) {
      console.log('   Using megacloud custom headers');
      requestHeaders = { ...megacloudHeaders };
    } else {
      // Default headers for non-megacloud requests
      requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      };
    }
    
    // Fetch the URL with proper headers
    const response = await axios.get(url, {
      headers: requestHeaders,
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
        example: `/proxy?url=${encodeURIComponent('https://hianime.to/search?keyword=naruto')}`,
      },
      'hianime-search': {
        path: '/scrape/hianime/search',
        method: 'GET',
        parameters: { query: 'Search query (required)', page: 'Page number (optional)' },
        example: '/scrape/hianime/search?query=naruto',
      },
      'hianime-info': {
        path: '/scrape/hianime/info',
        method: 'GET',
        parameters: { animeId: 'Anime ID (required)' },
        example: '/scrape/hianime/info?animeId=jujutsu-kaisen-100',
      },
      'hianime-episode-servers': {
        path: '/scrape/hianime/episode-servers',
        method: 'GET',
        parameters: { episodeId: 'Episode ID (required, format: anime-id?ep=123)' },
        example: '/scrape/hianime/episode-servers?episodeId=jujutsu-kaisen-100?ep=1',
      },
      'hianime-episode-sources': {
        path: '/scrape/hianime/episode-sources',
        method: 'GET',
        parameters: { 
          episodeId: 'Episode ID (required, format: anime-id?ep=number)',
          server: 'Server name (optional, default: hd-1)',
          category: 'Category (optional, default: sub, options: sub/dub/raw)'
        },
        example: '/scrape/hianime/episode-sources?episodeId=naruto?ep=1&server=hd-1&category=sub',
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
 * HiAnime Search Endpoint
 * Usage: GET /scrape/hianime/search?query=naruto
 */
app.get('/scrape/hianime/search', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // Try hi-api first (if enabled)
    if (HI_API_ENABLED) {
      try {
        const response = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/search`, {
          params: { q: query, page },
          timeout: 5000,
        });
        
        if (response.data && response.data.success && response.data.data) {
          const animes = response.data.data.animes || response.data.data.results || [];
          if (animes.length > 0) {
            // IMPORTANT: Don't clean IDs from hi-api - hi-api needs the full ID with numeric suffix
            // Only clean IDs from HTML scraping results
            const results = animes.map(item => ({
              id: item.id, // Keep original ID from hi-api (includes numeric suffix)
              title: item.name || item.title,
              image: item.poster || item.image || '',
              type: item.type || '',
              rating: item.rating || 0,
              url: item.url || `https://hianime.to/watch/${item.id}`,
            }));
            
            console.log(`✅ hi-api search: Found ${results.length} results`);
            return res.json({ success: true, data: results });
          }
        }
      } catch (apiError) {
        console.log('⚠️ hi-api search failed, falling back to HTML scraping...');
      }
    }
    
    // Fallback to HTML scraping
    const baseUrls = ['https://hianimez.to', 'https://hianime.to'];
    
    for (const baseUrl of baseUrls) {
      try {
        const searchUrl = `${baseUrl}/search?keyword=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`;
        
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 15000,
        });
        
        const $ = cheerio.load(response.data);
        const results = [];
        
        $('.film_list-wrap .flw-item, .item-inner, .anime-card, .film_list .flw-item').each((_, element) => {
          const $item = $(element);
          const link = $item.find('a').first().attr('href');
          const title = $item.find('.film-name, .anime-title, h3, h2, .dynamic-name').first().text().trim() ||
                       $item.find('a').first().attr('title') || '';
          const image = $item.find('img').first().attr('src') || 
                       $item.find('img').first().attr('data-src') ||
                       $item.find('img').first().attr('data-original') ||
                       $item.find('img').first().attr('data-lazy-src') || '';
          const type = $item.find('.fdi-type, .type, .film-type').text().trim() || '';
          const rating = parseFloat($item.find('.rating, .score').text().trim() || '0') || 0;
          
          if (link && title) {
            // Clean anime ID to remove numeric suffixes (e.g., "hoshi-no-umi-no-amuri-8552" -> "hoshi-no-umi-no-amuri")
            const animeId = cleanAnimeId(link);
            const fullImageUrl = image 
              ? (image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)
              : '';
            
            results.push({
              id: animeId,
              title: title,
              image: fullImageUrl,
              type: type,
              rating: rating,
              url: link.startsWith('http') ? link : `${baseUrl}${link.startsWith('/') ? '' : '/'}${link}`,
            });
          }
        });
        
        if (results.length > 0) {
          return res.json({ success: true, data: results });
        }
      } catch (urlError) {
        continue;
      }
    }
    
    return res.json({ success: true, data: [] });
  } catch (error) {
    console.error('HiAnime search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * HiAnime Info Endpoint
 * Usage: GET /scrape/hianime/info?animeId=jujutsu-kaisen-100
 */
app.get('/scrape/hianime/info', async (req, res) => {
  try {
    let { animeId } = req.query;
    
    if (!animeId) {
      return res.status(400).json({ error: 'animeId parameter is required' });
    }
    
    // Clean animeId: remove leading/trailing slashes, 'watch/' prefix, and numeric suffixes
    animeId = cleanAnimeId(animeId);
    
    // Validate that animeId is not purely numeric (HiAnime uses slugs, not numeric IDs)
    // Numeric IDs are typically from metadata APIs like Jikan/MyAnimeList
    if (/^\d+$/.test(animeId)) {
      return res.status(400).json({ 
        error: 'Invalid animeId format',
        message: 'HiAnime uses URL-friendly slugs (e.g., "jujutsu-kaisen-100"), not numeric IDs. Please search by title instead.',
        received: animeId
      });
    }
    
    // Try hi-api first (if enabled)
    if (HI_API_ENABLED) {
      // Store original animeId in case we need to try with numeric suffix
      const originalAnimeId = req.query.animeId;
      let triedOriginal = false;
      
      // Try with cleaned ID first, then with original ID if 404
      const animeIdsToTry = [animeId];
      if (originalAnimeId !== animeId && !/^\d+$/.test(originalAnimeId)) {
        animeIdsToTry.push(originalAnimeId);
      }
      
      for (const tryAnimeId of animeIdsToTry) {
        try {
          console.log(`🔍 Trying hi-api for animeId: ${tryAnimeId}`);
          // Get anime info
          const infoResponse = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${tryAnimeId}`, {
            timeout: 5000,
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
          });
          
          console.log(`   hi-api info response status: ${infoResponse.status}`);
          
          // If 404, try next ID
          if (infoResponse.status === 404) {
            console.log(`   hi-api returned 404 for ${tryAnimeId}, trying next ID...`);
            continue;
          }
          
          // Note: hi-api may log internal errors (like getAnimeAboutInfo 404) but still return valid data
          // These are non-critical - hi-api tries to fetch additional metadata but falls back gracefully
          if (infoResponse.data && infoResponse.data.success && infoResponse.data.data) {
            const responseData = infoResponse.data.data;
            // hi-api returns anime info nested under 'anime' property
            const animeData = responseData.anime || responseData;
            console.log(`   hi-api info success, title: ${animeData.title || animeData.name || 'N/A'}`);
            
            // Use the successful animeId for episode IDs
            const successfulAnimeId = tryAnimeId;
            
            // Get episodes separately
            // IMPORTANT: Use originalAnimeId (with numeric suffix) for episodes if available,
            // as hi-api requires the full ID with numeric suffix for episodes endpoint
            let episodes = [];
            try {
              // Determine which ID to use for episodes
              // Prefer originalAnimeId if it has numeric suffix, otherwise use successfulAnimeId
              const episodeAnimeId = (originalAnimeId && originalAnimeId !== successfulAnimeId && !/^\d+$/.test(originalAnimeId)) 
                ? originalAnimeId 
                : successfulAnimeId;
              
              console.log(`   Fetching episodes from hi-api for: ${episodeAnimeId} (successfulAnimeId: ${successfulAnimeId})`);
              const epResponse = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${episodeAnimeId}/episodes`, {
                timeout: 10000, // Increased timeout
                validateStatus: (status) => status < 500, // Don't throw on 4xx errors
              });
              
              console.log(`   hi-api episodes response status: ${epResponse.status}`);
              
              // Handle 404 - try with the other ID if different
              let episodesData = null;
              
              // First, try to get episodes from the response
              if (epResponse.data && epResponse.data.success && epResponse.data.data) {
                episodesData = epResponse.data.data;
                const rawEpCount = episodesData.episodes?.length || episodesData.sub?.length || 0;
                console.log(`   Got ${rawEpCount} episodes from hi-api (using ${episodeAnimeId})`);
              }
              
              // If we got a 404 or no episodes, try with the other ID
              if ((epResponse.status === 404 || !episodesData || (episodesData.episodes?.length || 0) === 0)) {
                const fallbackId = episodeAnimeId === originalAnimeId ? successfulAnimeId : originalAnimeId;
                if (fallbackId && fallbackId !== episodeAnimeId && !/^\d+$/.test(fallbackId)) {
                  console.log(`   hi-api episodes returned ${epResponse.status === 404 ? '404' : 'empty'} for ${episodeAnimeId}, trying fallback ID: ${fallbackId}`);
                  try {
                    const epResponse2 = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${fallbackId}/episodes`, {
                      timeout: 10000,
                      validateStatus: (status) => status < 500,
                    });
                    if (epResponse2.status !== 404 && epResponse2.data && epResponse2.data.success && epResponse2.data.data) {
                      const epData2 = epResponse2.data.data;
                      const epCount2 = epData2.episodes?.length || epData2.sub?.length || 0;
                      if (epCount2 > 0) {
                        console.log(`   ✅ Found ${epCount2} episodes using fallback ID: ${fallbackId}`);
                        episodesData = epData2;
                      } else {
                        console.log(`   Fallback ID returned empty episodes`);
                      }
                    } else {
                      console.log(`   Fallback ID also returned ${epResponse2.status === 404 ? '404' : 'invalid response'}`);
                    }
                  } catch (e) {
                    console.log(`   Failed to get episodes with fallback ID: ${e.message}`);
                  }
                }
              }
              
              if (episodesData) {
                const rawEpisodes = episodesData.episodes || episodesData.sub || [];
                
                console.log(`   Found ${rawEpisodes.length} raw episodes from hi-api`);
                if (rawEpisodes.length > 0) {
                  console.log(`   First episode sample:`, JSON.stringify(rawEpisodes[0], null, 2).substring(0, 200));
                }
                
                // Validate episodes - check if episodeId matches the anime we're requesting
                // hi-api sometimes returns episodes from wrong anime, so we need to filter them
                // Use episodeAnimeId (the one we used to fetch) for comparison
                const validEpisodes = rawEpisodes.filter(ep => {
                  if (!ep.episodeId) {
                    // If no episodeId, include it (might be valid)
                    return true;
                  }
                  
                  // Extract anime ID from episodeId (format: "anime-id?ep=number")
                  const epAnimeId = ep.episodeId.split('?')[0];
                  
                  // Check if episode belongs to the anime we're requesting
                  // Compare against episodeAnimeId (the one we used to fetch), originalAnimeId, and successfulAnimeId
                  // Normalize both IDs for comparison (remove trailing numbers that might differ)
                  const normalizeId = (id) => id.toLowerCase().replace(/-\d+$/, '');
                  const epAnimeIdNormalized = normalizeId(epAnimeId);
                  const episodeAnimeIdNormalized = normalizeId(episodeAnimeId);
                  const successfulAnimeIdNormalized = normalizeId(successfulAnimeId);
                  const animeIdNormalized = normalizeId(animeId);
                  const originalAnimeIdNormalized = originalAnimeId ? normalizeId(originalAnimeId) : '';
                  
                  // Match if episode ID matches any of our IDs (exact or normalized)
                  const matchesAnime = epAnimeId === episodeAnimeId ||  // Exact match with ID used to fetch
                                      epAnimeId === originalAnimeId ||   // Match with original ID (with numeric suffix)
                                      epAnimeId === successfulAnimeId || 
                                      epAnimeId === animeId ||
                                      epAnimeIdNormalized === episodeAnimeIdNormalized ||
                                      epAnimeIdNormalized === successfulAnimeIdNormalized ||
                                      epAnimeIdNormalized === animeIdNormalized ||
                                      (originalAnimeIdNormalized && epAnimeIdNormalized === originalAnimeIdNormalized);
                  
                  if (!matchesAnime) {
                    console.log(`   ⚠️ Filtering out episode ${ep.number || ep.episode}: episodeId (${ep.episodeId}) doesn't match`);
                    console.log(`      epAnimeId: "${epAnimeId}", episodeAnimeId: "${episodeAnimeId}", originalAnimeId: "${originalAnimeId}"`);
                  }
                  
                  return matchesAnime;
                });
                
                console.log(`   Validated ${validEpisodes.length} episodes (filtered ${rawEpisodes.length - validEpisodes.length} invalid)`);
                
                // Format episodes - IMPORTANT: Use episode.number, not episode.id
                // Use the successfulAnimeId (the one that worked with hi-api) for episode IDs
                episodes = validEpisodes
                  .filter(ep => ep.number || ep.episode) // Only include episodes with valid numbers
                  .map(ep => {
                    const epNum = ep.number || ep.episode || 0;
                    // Use successfulAnimeId (the one that worked) for episode URLs
                    return {
                      id: `${successfulAnimeId}?ep=${epNum}`, // Use the ID that worked with hi-api
                      number: epNum,
                      title: ep.title || `Episode ${epNum}`,
                      url: `https://hianime.to/watch/${successfulAnimeId}?ep=${epNum}`,
                    };
                  });
                
                console.log(`   Formatted ${episodes.length} episodes`);
              } else {
                console.log('   hi-api episodes response format unexpected:', JSON.stringify(epResponse.data).substring(0, 200));
                console.log('   Full response:', JSON.stringify(epResponse.data, null, 2).substring(0, 500));
              }
            } catch (epError) {
              if (epError.response) {
                console.log(`⚠️ hi-api episodes failed: ${epError.response.status} - ${epError.response.statusText}`);
                if (epError.response.data) {
                  console.log('   Error data:', JSON.stringify(epError.response.data).substring(0, 200));
                }
              } else {
                console.log(`⚠️ hi-api episodes failed: ${epError.message}`);
                console.log('   Error stack:', epError.stack?.substring(0, 300));
              }
              console.log('   Info will have no episodes from hi-api');
              // If episodes endpoint fails, return empty episodes
              // Don't fall back to HTML scraping - it's unreliable and gets wrong episodes
              episodes = [];
            }
            
            console.log(`✅ hi-api info: Found ${episodes.length} episodes`);
            
            // Return the response with episodes (or empty if hi-api failed)
            // Don't fall back to HTML scraping - it often returns episodes from wrong anime
            return res.json({
              success: true,
              data: {
                id: animeId, // Return cleaned ID for consistency
                title: animeData.title || animeData.name || '',
                image: animeData.poster || animeData.image || animeData.coverImage || '',
                description: animeData.description || animeData.synopsis || '',
                genres: animeData.genres || [],
                status: animeData.status || '',
                released: animeData.released || animeData.releaseDate || '',
                rating: animeData.rating || animeData.score || 0,
                type: animeData.type || '',
                duration: animeData.duration || '24 min',
                totalEpisodes: episodes.length,
                episodes: episodes,
              }
            });
          }
        } catch (apiError) {
          if (apiError.response) {
            console.log(`⚠️ hi-api info failed for ${tryAnimeId}: ${apiError.response.status} - ${apiError.response.statusText}`);
            if (apiError.response.data) {
              console.log('   Error data:', JSON.stringify(apiError.response.data).substring(0, 200));
            }
            // If 404, try next ID
            if (apiError.response.status === 404 && animeIdsToTry.length > 1) {
              continue;
            }
          } else {
            console.log(`⚠️ hi-api info failed for ${tryAnimeId}: ${apiError.message}`);
          }
        }
      }
      
      // If we tried all IDs and none worked, fall back to HTML scraping
      console.log('   All hi-api attempts failed, falling back to HTML scraping...');
    }
    
    // Fallback to HTML scraping
    const baseUrls = ['https://hianimez.to', 'https://hianime.to'];
    
    // Store the original animeId in case we need to try with numeric suffix
    const originalAnimeId = req.query.animeId;
    
    for (const baseUrl of baseUrls) {
      let response = null;
      let actualAnimeId = animeId; // The animeId to use for episode IDs
      
      try {
        // First try with cleaned animeId
        const animeUrl = `${baseUrl}/watch/${animeId}`;
        console.log(`Attempting to fetch: ${animeUrl}`);
        
        try {
          response = await axios.get(animeUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 15000,
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
          });
          
          // If 404 and we have an original ID that's different, try the original
          if (response.status === 404 && animeId !== originalAnimeId && !/^\d+$/.test(originalAnimeId)) {
            const originalUrl = `${baseUrl}/watch/${originalAnimeId}`;
            console.log(`404 for cleaned ID, trying original: ${originalUrl}`);
            try {
              const originalResponse = await axios.get(originalUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9',
                },
                timeout: 15000,
                validateStatus: (status) => status < 500,
              });
              
              if (originalResponse.status === 200) {
                response = originalResponse;
                actualAnimeId = cleanAnimeId(originalAnimeId); // Use cleaned version for episode IDs
                console.log(`✓ Success with original ID, using cleaned ID: ${actualAnimeId}`);
              }
            } catch (originalError) {
              console.log(`Original ID also failed: ${originalError.message}`);
            }
          }
        } catch (fetchError) {
          console.error(`Error fetching ${animeUrl}:`, fetchError.message);
          if (fetchError.response) {
            console.error(`Response status: ${fetchError.response.status}`);
          }
          continue; // Try next baseUrl
        }
        
        // If we still don't have a successful response, try next baseUrl
        if (!response || response.status !== 200) {
          console.log(`Failed to fetch (status: ${response?.status || 'no response'}), trying next baseUrl`);
          continue;
        }
        
        const $ = cheerio.load(response.data);
        
        const title = $('.anime-detail h1, .anime-title, h1, .film-name').first().text().trim() ||
                     $('meta[property="og:title"]').attr('content') || '';
        const image = $('.anime-poster img, .anime-cover img, .film-poster img').first().attr('src') ||
                     $('.anime-poster img, .anime-cover img, .film-poster img').first().attr('data-src') ||
                     $('meta[property="og:image"]').attr('content') || '';
        const description = $('.anime-description, .description, .synopsis, .film-description').text().trim() ||
                           $('meta[property="og:description"]').attr('content') || '';
        
        const genres = [];
        $('.anime-genre a, .genre a, .film-genre a').each((_, el) => {
          const genre = $(el).text().trim();
          if (genre) genres.push(genre);
        });
        
        const status = $('.anime-status, .status, .film-status').text().trim() || '';
        const released = $('.anime-released, .released, .film-year').text().trim() || '';
        const rating = parseFloat($('.anime-rating, .rating, .film-rating').text().trim() || '0') || 0;
        const type = $('.anime-type, .type, .film-type').text().trim() || '';
        const duration = $('.anime-duration, .duration, .film-duration').text().trim() || '24 min';
        
        const episodes = [];
        
        // First, try to find the main episode list container to scope our search
        // This prevents picking up episodes from related/recommended anime sections
        const episodeContainerSelectors = [
          '.ss-list',                      // Standard episode list container
          '.episode-list',                 // Episode list container
          '.episodes-list',                // Episodes list container
          '.watch-episodes',               // Watch episodes container
          '#episode-list',                 // Episode list by ID
          '.anime-episodes',               // Anime episodes container
          '.film-poster-list',             // Film poster list (episodes)
          '.detail-infor-content',         // Detail info content (common on HiAnime)
          '.list-episode',                 // List episode container
          '.episode-wrapper',              // Episode wrapper
          '.episodes',                     // Episodes container
        ];
        
        let $episodeContainer = null;
        for (const containerSelector of episodeContainerSelectors) {
          $episodeContainer = $(containerSelector).first();
          if ($episodeContainer.length > 0) {
            console.log(`Found episode container: ${containerSelector} (${$episodeContainer.length} elements)`);
            break;
          }
        }
        
        // If no container found, use the whole page but be more careful
        const $searchScope = $episodeContainer.length > 0 ? $episodeContainer : $('body');
        console.log(`Using search scope: ${$episodeContainer.length > 0 ? 'container' : 'body'}`);
        
        // Try multiple selectors for episode lists (HiAnime uses various structures)
        // Scoped to the episode container to avoid picking up other anime's episodes
        const episodeSelectors = [
          'a[href*="?ep="]',              // Links with ?ep= parameter (most reliable)
          'a[href*="ep="]',               // Links with ep= parameter (alternative)
          '.ss-list a',                    // Standard episode list
          '.episode-item a',               // Episode item links
          '.episode-list-item a',          // Episode list items
          '.ep-item a',                    // Episode items
          '.episode a',                    // Episode links
          '.episodes-list a',              // Episodes list
          '.episode-list a',               // Episode list
          '[data-episode]',                // Data attribute episodes
          '.watch-episodes a',             // Watch episodes
          '.list-episode a',               // List episode links
          '.detail-infor-content a',       // Detail info content links
          'a[href*="/watch/"]',           // Any watch links
        ];
        
        let foundEpisodes = false;
        let totalLinksFound = 0;
        
        for (const selector of episodeSelectors) {
          const links = $searchScope.find(selector);
          totalLinksFound += links.length;
          console.log(`Trying selector "${selector}": found ${links.length} links`);
          
          links.each((_, element) => {
            const $ep = $(element);
            let epLink = $ep.attr('href') || '';
            
            // Skip if already processed or invalid
            if (!epLink || epLink.includes('#') || epLink === 'javascript:void(0)') {
              return;
            }
            
            // IMPORTANT: Verify the episode link belongs to the current anime
            // Extract anime ID from the link
            let linkAnimeId = null;
            if (epLink.includes('/watch/')) {
              const match = epLink.match(/\/watch\/([^?\/]+)/);
              if (match) {
                linkAnimeId = cleanAnimeId(match[1]);
              }
            }
            
            // If link has an anime ID, it must match the requested anime
            if (linkAnimeId && linkAnimeId !== actualAnimeId && linkAnimeId !== animeId) {
              // This link points to a different anime, skip it
              console.log(`   Skipping episode link - belongs to different anime: ${linkAnimeId} (expected: ${actualAnimeId})`);
              return;
            }
            
            // For relative links with ?ep=, verify they're on the same page
            if (epLink.startsWith('?ep=') || epLink.startsWith('&ep=')) {
              // This is a relative link on the current page - it's valid
            } else if (!epLink.includes('/watch/') && !epLink.includes(actualAnimeId) && !epLink.includes(animeId)) {
              // Relative link that doesn't match our anime - skip it
              console.log(`   Skipping episode link - doesn't match anime: ${epLink}`);
              return;
            }
            
            // Extract episode number from various formats
            let epNum = 0;
            let epId = '';
            
            // Try to extract from ?ep= parameter (most common format)
            const epMatch = epLink.match(/[?&]ep=(\d+)/i);
            if (epMatch) {
              epNum = parseInt(epMatch[1]) || 0;
              // Use the actualAnimeId for the episode ID
              epId = `${actualAnimeId}?ep=${epMatch[1]}`;
            } else {
              // Try to extract from URL path
              const pathMatch = epLink.match(/ep-?(\d+)/i) || epLink.match(/-(\d+)$/);
              if (pathMatch) {
                epNum = parseInt(pathMatch[1]) || 0;
                epId = `${actualAnimeId}?ep=${epNum}`;
              } else {
                // Try data attributes
                const dataEp = $ep.attr('data-episode') || $ep.attr('data-ep');
                if (dataEp) {
                  epNum = parseInt(dataEp) || 0;
                  epId = `${actualAnimeId}?ep=${epNum}`;
                }
              }
            }
            
            // Extract title
            const epTitle = $ep.text().trim() || 
                          $ep.find('.episode-title, .title, .ep-name').text().trim() ||
                          $ep.attr('title') || 
                          `Episode ${epNum}`;
            
            // Build full URL - ensure it uses the current anime's URL
            let fullUrl = '';
            if (epLink.startsWith('http')) {
              fullUrl = epLink;
            } else if (epLink.includes('?ep=')) {
              // Relative link with episode parameter - use current anime URL
              fullUrl = `${baseUrl}/watch/${actualAnimeId}${epLink.startsWith('?') ? '' : '/'}${epLink}`;
            } else {
              fullUrl = `${baseUrl}${epLink.startsWith('/') ? '' : '/'}${epLink}`;
            }
            
            // Only add if we have a valid episode number and the link belongs to this anime
            if (epNum > 0) {
              // Check if episode already exists (avoid duplicates)
              const exists = episodes.some(ep => ep.number === epNum);
              if (!exists) {
                episodes.push({
                  id: epId || `${actualAnimeId}?ep=${epNum}`,
                  number: epNum,
                  title: epTitle,
                  url: fullUrl,
                });
                foundEpisodes = true;
              }
            }
          });
          
          if (foundEpisodes) break; // Stop trying other selectors if we found episodes
        }
        
        console.log(`Total links checked: ${totalLinksFound}, Episodes extracted: ${episodes.length}`);
        
        // If no episodes found, try extracting from script tags (episodes might be in JSON)
        if (episodes.length === 0) {
          console.log('No episodes found with link search, trying script tag extraction...');
          $('script').each((_, element) => {
            const scriptContent = $(element).html() || '';
            
            // Look for episode data in various JSON formats
            // Pattern 1: var episodes = [...]
            const episodesVarMatch = scriptContent.match(/var\s+episodes\s*=\s*(\[[^\]]+\])/);
            if (episodesVarMatch) {
              try {
                const episodesData = JSON.parse(episodesVarMatch[1]);
                if (Array.isArray(episodesData)) {
                  episodesData.forEach((ep, index) => {
                    const epNum = ep.number || ep.episode || ep.ep || (index + 1);
                    if (epNum > 0) {
                      const epId = `${actualAnimeId}?ep=${epNum}`;
                      episodes.push({
                        id: epId,
                        number: epNum,
                        title: ep.title || `Episode ${epNum}`,
                        url: `${baseUrl}/watch/${actualAnimeId}?ep=${epNum}`,
                      });
                    }
                  });
                  console.log(`Found ${episodes.length} episodes from script tag (var episodes)`);
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
            
            // Pattern 2: episodes: [...]
            const episodesObjMatch = scriptContent.match(/episodes\s*:\s*(\[[^\]]+\])/);
            if (episodesObjMatch && episodes.length === 0) {
              try {
                const episodesData = JSON.parse(episodesObjMatch[1]);
                if (Array.isArray(episodesData)) {
                  episodesData.forEach((ep, index) => {
                    const epNum = ep.number || ep.episode || ep.ep || (index + 1);
                    if (epNum > 0) {
                      const epId = `${actualAnimeId}?ep=${epNum}`;
                      episodes.push({
                        id: epId,
                        number: epNum,
                        title: ep.title || `Episode ${epNum}`,
                        url: `${baseUrl}/watch/${actualAnimeId}?ep=${epNum}`,
                      });
                    }
                  });
                  console.log(`Found ${episodes.length} episodes from script tag (episodes object)`);
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
            
            // Pattern 3: Look for episode numbers in data attributes or IDs
            const epNumbers = scriptContent.match(/ep[isode]*["']?\s*[:=]\s*["']?(\d+)/gi);
            if (epNumbers && episodes.length === 0) {
              const uniqueEpNums = [...new Set(epNumbers.map(m => parseInt(m.match(/\d+/)[0])))].sort((a, b) => a - b);
              uniqueEpNums.forEach(epNum => {
                if (epNum > 0 && epNum < 10000) { // Reasonable episode number limit
                  const epId = `${actualAnimeId}?ep=${epNum}`;
                  episodes.push({
                    id: epId,
                    number: epNum,
                    title: `Episode ${epNum}`,
                    url: `${baseUrl}/watch/${actualAnimeId}?ep=${epNum}`,
                  });
                }
              });
              if (episodes.length > 0) {
                console.log(`Found ${episodes.length} episodes from script tag (episode numbers)`);
              }
            }
          });
        }
        
        // If still no episodes found, try a more aggressive search on the whole page
        if (episodes.length === 0) {
          console.log('No episodes found with scoped search, trying whole page search...');
          $('a[href*="?ep="], a[href*="ep="]').each((_, element) => {
            const $ep = $(element);
            let epLink = $ep.attr('href') || '';
            
            if (!epLink || epLink.includes('#') || epLink === 'javascript:void(0)') {
              return;
            }
            
            // Extract episode number from ?ep= parameter
            const epMatch = epLink.match(/[?&]ep=(\d+)/i);
            if (epMatch) {
              const epNum = parseInt(epMatch[1]) || 0;
              if (epNum > 0) {
                // Check if this link belongs to the current anime
                const linkMatchesAnime = epLink.includes(actualAnimeId) || 
                                        epLink.includes(animeId) ||
                                        epLink.startsWith('/watch/') ||
                                        epLink.startsWith('?ep=') ||
                                        epLink.startsWith('&ep=');
                
                if (linkMatchesAnime) {
                  const exists = episodes.some(ep => ep.number === epNum);
                  if (!exists) {
                    const epId = `${actualAnimeId}?ep=${epMatch[1]}`;
                    const epTitle = $ep.text().trim() || `Episode ${epNum}`;
                    let fullUrl = '';
                    if (epLink.startsWith('http')) {
                      fullUrl = epLink;
                    } else {
                      fullUrl = `${baseUrl}/watch/${actualAnimeId}?ep=${epMatch[1]}`;
                    }
                    
                    episodes.push({
                      id: epId,
                      number: epNum,
                      title: epTitle,
                      url: fullUrl,
                    });
                    console.log(`Found episode ${epNum} via aggressive search`);
                  }
                }
              }
            }
          });
        }
        
        // Sort episodes by number
        episodes.sort((a, b) => a.number - b.number);
        
        console.log(`Final count: Found ${episodes.length} episodes for ${actualAnimeId}`);
        
        const fullImageUrl = image 
          ? (image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)
          : '';
        
        return res.json({
          success: true,
          data: {
            id: actualAnimeId,
            title: title,
            image: fullImageUrl,
            description: description,
            genres: genres,
            status: status,
            released: released,
            rating: rating,
            type: type,
            duration: duration,
            totalEpisodes: episodes.length,
            episodes: episodes,
          }
        });
      } catch (urlError) {
        console.error(`Error processing ${baseUrl}:`, urlError.message);
        continue;
      }
    }
    
    return res.status(404).json({ 
      error: 'Anime not found',
      message: `Could not find anime with ID: ${animeId}`,
      triedUrls: baseUrls.map(url => `${url}/watch/${animeId}`),
      suggestion: 'Try searching by title instead, or verify the anime ID is correct'
    });
  } catch (error) {
    console.error('HiAnime info error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * HiAnime Episode Servers Endpoint
 * Usage: GET /scrape/hianime/episode-servers?episodeId=jujutsu-kaisen-100?ep=1
 */
app.get('/scrape/hianime/episode-servers', async (req, res) => {
  try {
    const { episodeId } = req.query;
    
    if (!episodeId) {
      return res.status(400).json({ error: 'episodeId parameter is required' });
    }
    
    const baseUrls = ['https://hianimez.to', 'https://hianime.to'];
    
    for (const baseUrl of baseUrls) {
      try {
        // Build episode URL - handle both formats: "anime-id?ep=123" and "/watch/anime-id?ep=123"
        let episodeUrl = episodeId;
        if (!episodeId.startsWith('http')) {
          if (episodeId.includes('?ep=')) {
            const [animeId, epParam] = episodeId.split('?');
            episodeUrl = `${baseUrl}/watch/${animeId}?${epParam}`;
          } else {
            episodeUrl = `${baseUrl}/watch/${episodeId}`;
          }
        }
        
        const response = await axios.get(episodeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': baseUrl,
          },
          timeout: 15000,
        });
        
        const $ = cheerio.load(response.data);
        const servers = [];
        
        // Extract server options (sub, dub, raw)
        const serverTypes = ['sub', 'dub', 'raw'];
        
        for (const serverType of serverTypes) {
          // Look for server buttons/links
          $(`.server-${serverType}, .${serverType}-server, [data-server="${serverType}"], button[data-type="${serverType}"]`).each((_, element) => {
            const $server = $(element);
            const serverName = $server.text().trim() || serverType.toUpperCase();
            const serverId = $server.attr('data-id') || $server.attr('data-server-id') || serverType;
            
            servers.push({
              name: serverName,
              id: serverId,
              type: serverType,
            });
          });
        }
        
        // If no servers found with specific selectors, try generic ones
        if (servers.length === 0) {
          $('.server-item, .server-option, button[data-server], .servers-list button').each((_, element) => {
            const $server = $(element);
            const serverName = $server.text().trim() || $server.attr('title') || 'Server';
            const serverId = $server.attr('data-id') || $server.attr('data-server') || serverName.toLowerCase().replace(/\s+/g, '-');
            const serverType = $server.attr('data-type') || 'sub';
            
            servers.push({
              name: serverName,
              id: serverId,
              type: serverType,
            });
          });
        }
        
        // Extract video sources (iframes, direct links)
        const sources = [];
        $('iframe[src*="embed"], iframe[src*="player"], video source, .player iframe').each((_, element) => {
          const $el = $(element);
          const src = $el.attr('src') || $el.attr('data-src');
          if (src) {
            sources.push({
              url: src.startsWith('http') ? src : `${baseUrl}${src.startsWith('/') ? '' : '/'}${src}`,
              quality: 'auto',
              isM3U8: src.includes('.m3u8'),
            });
          }
        });
        
        // Extract from script tags
        $('script').each((_, element) => {
          const scriptContent = $(element).html() || '';
          const m3u8Matches = scriptContent.match(/["']([^"']*\.m3u8[^"']*)["']/g);
          if (m3u8Matches) {
            m3u8Matches.forEach(match => {
              const url = match.replace(/["']/g, '');
              sources.push({
                url: url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`,
                quality: 'auto',
                isM3U8: true,
              });
            });
          }
        });
        
        return res.json({
          success: true,
          data: {
            servers: servers.length > 0 ? servers : [{ name: 'Default', id: 'default', type: 'sub' }],
            sources: sources,
          }
        });
      } catch (urlError) {
        continue;
      }
    }
    
    return res.json({ success: true, data: { servers: [], sources: [] } });
  } catch (error) {
    console.error('HiAnime episode servers error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * HiAnime Episode Sources Endpoint (for streaming)
 * Usage: GET /scrape/hianime/episode-sources?episodeId=anime-id?ep=1&server=hd-1&category=sub
 */
/**
 * Proxy M3U8 video streams with proper headers
 * This endpoint proxies M3U8 files and their segments to bypass CORS and header requirements
 * 
 * Usage: GET /proxy/m3u8?url=VIDEO_URL&referer=REFERER_URL
 */
app.get('/proxy/m3u8', async (req, res) => {
  try {
    const { url, referer } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'url parameter is required' });
    }
    
    // Decode URL if encoded
    const videoUrl = decodeURIComponent(url);
    const refererUrl = referer ? decodeURIComponent(referer) : 'https://hianime.to/';
    
    console.log(`📺 Proxying M3U8: ${videoUrl.substring(0, 80)}...`);
    console.log(`   Referer: ${refererUrl}`);
    
    // Check if this is a megacloud request and get custom headers
    const megacloudHeaders = getMegacloudHeaders(videoUrl);
    
    // Build headers - use megacloud custom headers if available, otherwise use defaults
    let requestHeaders = {};
    if (megacloudHeaders) {
      console.log('   Using megacloud custom headers');
      requestHeaders = { ...megacloudHeaders };
      // Override referer if provided
      if (refererUrl) {
        requestHeaders['Referer'] = refererUrl;
      }
    } else {
      // Default headers for non-megacloud requests
      requestHeaders = {
        'Referer': refererUrl,
        'Origin': new URL(refererUrl).origin,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
    }
    
    // Fetch the M3U8 file with proper headers
    const response = await axios.get(videoUrl, {
      headers: requestHeaders,
      responseType: 'text', // M3U8 files are text
      timeout: 10000,
    });
    
    // Set appropriate headers for M3U8 content
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    
    // Return the M3U8 content
    res.send(response.data);
  } catch (error) {
    console.error('M3U8 proxy error:', error.message);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: 'Failed to proxy M3U8',
        message: error.message,
        status: error.response.status,
      });
    } else {
      res.status(500).json({ error: 'Failed to proxy M3U8', message: error.message });
    }
  }
});

app.get('/scrape/hianime/episode-sources', async (req, res) => {
  try {
    const { episodeId, server = 'hd-1', category = 'sub' } = req.query;
    
    if (!episodeId) {
      return res.status(400).json({ error: 'episodeId parameter is required' });
    }
    
    // Validate episode ID format: should be "anime-id?ep=number"
    if (!episodeId.includes('?ep=')) {
      return res.status(400).json({ 
        error: 'Invalid episodeId format',
        message: 'Episode ID must be in format: anime-id?ep=number (e.g., "naruto?ep=1")',
        received: episodeId
      });
    }
    
    // Try hi-api first (if enabled)
    if (HI_API_ENABLED) {
      try {
        // First, get available servers for this episode
        let availableServers = [];
        try {
          const serversResponse = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/episode/servers`, {
            params: { animeEpisodeId: episodeId },
            timeout: 5000,
          });
          
          if (serversResponse.data && serversResponse.data.success && serversResponse.data.data) {
            const serversData = serversResponse.data.data;
            // Get servers for the requested category
            availableServers = serversData[category] || serversData.sub || [];
          }
        } catch (serversError) {
          console.log('⚠️ Could not get available servers, using default');
        }
        
        // Use first available server or the requested one
        const serverToUse = availableServers.length > 0 
          ? availableServers[0].serverName 
          : server;
        
        // Get episode sources
        const response = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/episode/sources`, {
          params: {
            animeEpisodeId: episodeId,
            server: serverToUse,
            category: category,
          },
          timeout: 10000,
        });
        
        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data;
          const sources = data.sources || [];
          
          if (sources.length > 0) {
            console.log(`✅ hi-api episode sources: Found ${sources.length} sources`);
            
            // Format sources for our app
            const formattedSources = sources.map(src => ({
              url: src.url || '',
              quality: src.quality || 'auto',
              isM3U8: src.isM3U8 !== false && (src.type === 'hls' || src.url?.includes('.m3u8')),
              server: serverToUse,
            }));
            
            // Check if any source is from megacloud and use custom headers
            const hasMegacloudSource = formattedSources.some(src => 
              src.url && (src.url.includes('megacloud.blog') || src.url.includes('megacloud'))
            );
            
            // Use megacloud headers if any source is from megacloud, otherwise use provided headers or default
            let responseHeaders = data.headers || { Referer: 'https://hianime.to/' };
            if (hasMegacloudSource) {
              const megacloudHeaders = getMegacloudHeaders(formattedSources[0]?.url || '');
              if (megacloudHeaders) {
                responseHeaders = megacloudHeaders;
                console.log('   Using megacloud custom headers for episode sources');
              }
            }
            
            return res.json({
              success: true,
              data: {
                sources: formattedSources,
                headers: responseHeaders,
                tracks: data.tracks || [], // Subtitles
                intro: data.intro || null, // Intro timing
                outro: data.outro || null, // Outro timing
              }
            });
          }
        }
      } catch (apiError) {
        if (apiError.response) {
          console.log(`⚠️ hi-api episode sources failed: ${apiError.response.status} - ${apiError.response.data?.message || apiError.message}`);
        } else {
          console.log(`⚠️ hi-api episode sources failed: ${apiError.message}`);
        }
        console.log('   Falling back to HTML scraping...');
      }
    }
    
    // Fallback to HTML scraping (existing logic can be added here)
    return res.status(404).json({ 
      error: 'Episode sources not found',
      message: 'Could not fetch episode sources. Please ensure hi-api is running or HTML scraping is implemented.',
    });
  } catch (error) {
    console.error('HiAnime episode sources error:', error);
    res.status(500).json({ error: error.message });
  }
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

