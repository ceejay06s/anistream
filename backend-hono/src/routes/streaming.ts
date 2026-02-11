import { Hono } from 'hono';
import { getEpisodeSources, getEpisodeServers } from '../services/streamingService';
import { gotScraping } from 'got-scraping';

export const streamingRoutes = new Hono();

// Server priority order for fallback
const SERVER_PRIORITY = ['hd-1', 'hd-2', 'megacloud', 'streamsb', 'streamtape'];

// Get episode sources with optional multi-server fallback
streamingRoutes.get('/sources', async (c) => {
  let episodeId = c.req.query('episodeId');
  const requestedServer = c.req.query('server') || 'hd-1';
  const category = c.req.query('category') || 'sub';
  const fallback = c.req.query('fallback') === 'true';

  if (!episodeId) {
    return c.json({
      error: 'episodeId parameter is required'
    }, 400);
  }

  // Don't clean episodeId if it's already in the correct format (?ep=)
  // Only clean if it has other query parameters
  if (episodeId.includes('?') && !episodeId.includes('?ep=')) {
    episodeId = episodeId.split('?')[0];
  }

  // Determine servers to try
  const serversToTry = fallback
    ? SERVER_PRIORITY
    : [requestedServer, ...SERVER_PRIORITY.filter(s => s !== requestedServer)];

  // Try each server until one succeeds
  for (const serverToTry of serversToTry) {
    try {
      console.log(`Trying server: ${serverToTry} for episode: ${episodeId}`);
      const sources = await getEpisodeSources(episodeId, serverToTry, category as 'sub' | 'dub' | 'raw');

      if (sources && sources.sources.length > 0) {
        console.log(`Success with server: ${serverToTry}, found ${sources.sources.length} sources`);
        return c.json({
          success: true,
          data: sources,
          server: serverToTry,
          triedServers: serversToTry.slice(0, serversToTry.indexOf(serverToTry) + 1)
        });
      }

      console.log(`Server ${serverToTry} returned no sources, trying next...`);
    } catch (error: any) {
      console.log(`Server ${serverToTry} failed: ${error.message}, trying next...`);
      // Continue to next server
    }
  }

  // All servers failed
  console.error(`All servers failed for episode: ${episodeId}`);
  return c.json({
    success: false,
    error: 'No streaming sources found from any server',
    data: { sources: [] },
    triedServers: serversToTry
  }, 404);
});

// Get episode servers
streamingRoutes.get('/servers', async (c) => {
  let episodeId = c.req.query('episodeId');

  if (!episodeId) {
    return c.json({ 
      error: 'episodeId parameter is required' 
    }, 400);
  }

  // Clean episodeId - remove query parameters if present
  if (episodeId.includes('?')) {
    episodeId = episodeId.split('?')[0];
  }

  try {
    const servers = await getEpisodeServers(episodeId);
    return c.json({ success: true, data: servers });
  } catch (error: any) {
    console.error('Error getting episode servers:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get episode servers'
    }, 500);
  }
});

// Get embed URL for iframe fallback
streamingRoutes.get('/embed', async (c) => {
  const episodeId = c.req.query('episodeId');
  const server = c.req.query('server') || 'hd-2'; // hd-2 = megacloud
  const category = c.req.query('category') || 'sub';

  if (!episodeId) {
    return c.json({ error: 'episodeId parameter is required' }, 400);
  }

  try {
    // Get episode servers to find the server ID
    const servers = await getEpisodeServers(episodeId);

    // Find the server matching the requested server name
    const serverMap: Record<string, string> = {
      'hd-1': 'HD-1',
      'hd-2': 'HD-2',
      'megacloud': 'MegaCloud',
      'streamsb': 'StreamSB',
      'streamtape': 'Streamtape'
    };

    const serverName = serverMap[server] || server;
    const matchingServer = servers.find(
      s => s.name.toLowerCase().includes(serverName.toLowerCase()) &&
           (!s.category || s.category === category)
    );

    if (!matchingServer || !matchingServer.id) {
      return c.json({
        success: false,
        error: `Server ${server} not found for this episode`
      }, 404);
    }

    // Fetch the embed URL from hianime.to AJAX endpoint
    const ajaxUrl = `https://hianimez.to/ajax/v2/episode/sources?id=${matchingServer.id}`;
    console.log('Fetching embed URL from:', ajaxUrl);

    const response = await gotScraping({
      url: ajaxUrl,
      responseType: 'json',
      headers: {
        'Referer': 'https://hianimez.to/',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    const data = response.body as any;

    if (data && data.link) {
      console.log('Got embed URL:', data.link);
      return c.json({
        success: true,
        embedURL: data.link,
        server: server,
        serverId: matchingServer.id
      });
    }

    return c.json({
      success: false,
      error: 'Could not get embed URL'
    }, 404);

  } catch (error: any) {
    console.error('Error getting embed URL:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get embed URL'
    }, 500);
  }
});

// Check if URL is a video segment (not M3U8 playlist)
const isVideoSegment = (url: string): boolean => {
  // Common segment extensions (including obfuscated ones)
  return /\.(ts|jpg|jpeg|html|png|gif|webp|mp4|aac|m4s|key)(\?|$)/i.test(url) ||
         (url.includes('/seg-') || url.includes('/segment') || url.includes('/chunk'));
};

// Proxy video stream to handle CORS
streamingRoutes.get('/proxy', async (c) => {
  const url = c.req.query('url');

  if (!url) {
    return c.json({ error: 'url parameter is required' }, 400);
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const isM3U8 = decodedUrl.includes('.m3u8');
    const isSegment = isVideoSegment(decodedUrl);

    console.log(`Proxying ${isM3U8 ? 'M3U8' : isSegment ? 'segment' : 'video'}: ${decodedUrl.substring(0, 100)}...`);

    // Use got-scraping for browser-like TLS fingerprint
    // The TLS fingerprint is the key to bypassing CDN anti-bot
    const response = await gotScraping({
      url: decodedUrl,
      responseType: isM3U8 ? 'text' : 'buffer',
      timeout: { request: 30000 },
      followRedirect: true,
      maxRedirects: 5,
      throwHttpErrors: false,
      // Enable header generator for TLS fingerprint
      useHeaderGenerator: true,
      headerGeneratorOptions: {
        browsers: ['safari'],
        devices: ['mobile'],
        operatingSystems: ['ios'],
        locales: ['en-US'],
      },
      // Critical: Set Referer to megacloud.blog for segments
      headers: {
        'Referer': isSegment ? 'https://megacloud.blog/' : 'https://hianime.to/',
        'Origin': isSegment ? 'https://megacloud.blog' : 'https://hianime.to',
      },
    });

    console.log(`Response: ${response.statusCode} for ${decodedUrl.substring(0, 60)}...`);

    if (response.statusCode >= 400) {
      const error: any = new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      error.response = {
        status: response.statusCode,
        statusText: response.statusMessage,
        headers: response.headers,
        data: response.body,
      };
      throw error;
    }

    let content: string | Buffer = isM3U8
      ? (response.body as Buffer).toString()
      : (response.rawBody as Buffer);
    let contentType = (response.headers['content-type'] as string) ||
      (isM3U8 ? 'application/vnd.apple.mpegurl' : 'video/mp2t');

    // Force octet-stream for obfuscated segment extensions
    if (isSegment && /\.(jpg|jpeg|html|png|gif|webp|js|css|txt)(\?|$)/i.test(decodedUrl)) {
      contentType = 'application/octet-stream';
    }

    // If it's an m3u8 file, rewrite URLs to proxy through backend
    if (isM3U8 && typeof content === 'string') {
      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);
      const host = c.req.header('host') || 'localhost:8801';
      const protocol = c.req.header('x-forwarded-proto') || 'http';
      const proxyBase = `${protocol}://${host}/api/streaming/proxy`;

      const lines = content.split(/\r?\n/);

      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();

        // Handle #EXT-X-KEY lines - proxy encryption key URLs
        if (trimmed.startsWith('#EXT-X-KEY')) {
          const uriMatch = trimmed.match(/URI="([^"]+)"/);
          if (uriMatch && uriMatch[1]) {
            let keyUrl = uriMatch[1];
            if (!keyUrl.startsWith('http')) {
              try {
                keyUrl = new URL(keyUrl, baseUrl).href;
              } catch (e) {
                return line;
              }
            }
            const proxiedKeyUrl = `${proxyBase}?url=${encodeURIComponent(keyUrl)}`;
            return trimmed.replace(/URI="[^"]+"/, `URI="${proxiedKeyUrl}"`);
          }
          return line;
        }

        // Skip other comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) {
          return line;
        }

        // Check if it's a URL (absolute or relative)
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          // Absolute URL - proxy it
          const proxyUrl = `${proxyBase}?url=${encodeURIComponent(trimmed)}`;
          return proxyUrl;
        } else if (trimmed && !trimmed.startsWith('#')) {
          // Relative URL - make absolute then proxy
          try {
            const absoluteUrl = new URL(trimmed, baseUrl).href;
            const proxyUrl = `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}`;
            return proxyUrl;
          } catch (e) {
            return line;
          }
        }

        return line;
      });

      content = rewrittenLines.join('\n');
    }

    // Set response headers
    c.header('Content-Type', contentType);
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Range, Content-Type');
    c.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    c.header('Accept-Ranges', 'bytes');
    c.header('Cache-Control', 'public, max-age=3600');

    // Forward content length for segments
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      c.header('Content-Length', String(contentLength));
    }

    if (typeof content === 'string') {
      return c.text(content);
    } else {
      // Convert Buffer to Uint8Array for Hono compatibility
      return c.body(new Uint8Array(content));
    }
  } catch (error: any) {
    console.error('Error proxying video:', error.message);
    console.error('Error details:', {
      url: url?.substring(0, 100),
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data?.substring?.(0, 200),
    });
    
    // If it's a 403, the CDN is blocking our request
    // This might be due to anti-bot measures or missing cookies/session
    if (error.response?.status === 403) {
      return c.json({ 
        error: 'Video server blocked the request (403 Forbidden)',
        details: 'The video hosting server is blocking proxy requests. This may require direct browser access or additional authentication.',
        suggestion: 'Try accessing the video directly or check if the source requires special authentication'
      }, 403);
    }
    
    return c.json({ 
      error: error.message || 'Failed to proxy video',
      details: error.response?.status ? `Server returned ${error.response.status}` : undefined
    }, error.response?.status || 500);
  }
});
