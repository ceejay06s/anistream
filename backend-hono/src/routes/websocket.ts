import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { getEpisodeSources, getEpisodeServers } from '../services/streamingService.js';
import { WebSocketServer, WebSocket as WS } from 'ws';
import { getCachedServer, setCachedServer, markServerFailed, isCacheEnabled } from '../services/streamCache.js';

// Store active connections
const connections = new Map<string, WebSocket>();

export interface StreamRequest {
  type: 'get_sources';
  episodeId: string;
  category: 'sub' | 'dub';
  clientId: string;
}

export interface StreamResponse {
  type: 'sources' | 'status' | 'error' | 'retry';
  data?: any;
  message?: string;
  server?: string;
  serverIndex?: number;
  totalServers?: number;
  fromCache?: boolean;
}

// Server priority for streaming
const SERVER_PRIORITY = ['hd-1', 'hd-2', 'megacloud', 'streamsb', 'streamtape'];

// Try to get working sources by cycling through servers
async function findWorkingSources(
  episodeId: string,
  category: 'sub' | 'dub',
  sendMessage: (msg: StreamResponse) => void
): Promise<any> {
  const failedServersThisRequest: string[] = [];

  // Check cache for known-good server
  const cached = await getCachedServer(episodeId, category);

  if (cached && cached.server) {
    sendMessage({
      type: 'status',
      message: `Trying cached server: ${cached.server.toUpperCase()}`,
    });

    try {
      console.log(`[WS] Trying cached server: ${cached.server} (${cached.successCount} previous successes)`);
      const sources = await getEpisodeSources(episodeId, cached.server, category);

      if (sources && sources.sources && sources.sources.length > 0) {
        console.log(`[WS] Cache HIT! Server ${cached.server} worked`);
        // Update cache with new success
        await setCachedServer(episodeId, category, cached.server, failedServersThisRequest);
        return {
          ...sources,
          usedServer: cached.server,
          serverIndex: 0,
          totalServers: 1,
          fromCache: true,
        };
      }

      console.log(`[WS] Cached server ${cached.server} returned no sources, cycling...`);
      failedServersThisRequest.push(cached.server);
      await markServerFailed(episodeId, category, cached.server);
    } catch (err: any) {
      console.log(`[WS] Cached server ${cached.server} failed: ${err.message}`);
      failedServersThisRequest.push(cached.server);
      await markServerFailed(episodeId, category, cached.server);
    }
  }

  // Get available servers for this episode
  let servers = SERVER_PRIORITY;

  try {
    const availableServers = await getEpisodeServers(episodeId);
    if (availableServers && availableServers.length > 0) {
      // Filter by category and extract server names
      servers = availableServers
        .filter((s: any) => !s.category || s.category === category)
        .map((s: any) => s.name?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'hd-1');

      // Remove duplicates
      servers = [...new Set(servers)] as string[];

      if (servers.length === 0) {
        servers = SERVER_PRIORITY;
      }
    }
  } catch (err) {
    console.log('Error getting servers, using defaults:', err);
  }

  // Filter out servers we know failed (from cache + this request)
  const knownFailedServers = [...(cached?.failedServers || []), ...failedServersThisRequest];
  const serversToTry = servers.filter(s => !knownFailedServers.includes(s));

  const totalServers = serversToTry.length;
  const skippedCount = servers.length - totalServers;

  if (skippedCount > 0) {
    console.log(`[WS] Skipping ${skippedCount} known-failed servers: ${knownFailedServers.join(', ')}`);
  }

  sendMessage({
    type: 'status',
    message: `Found ${totalServers} servers${skippedCount > 0 ? ` (skipped ${skippedCount} failed)` : ''}`,
    totalServers,
  });

  // Try each server until one works
  for (let i = 0; i < serversToTry.length; i++) {
    const server = serversToTry[i];

    sendMessage({
      type: 'retry',
      message: `Trying server: ${server.toUpperCase()}`,
      server,
      serverIndex: i,
      totalServers,
    });

    try {
      console.log(`[WS] Trying server ${i + 1}/${totalServers}: ${server}`);
      const sources = await getEpisodeSources(episodeId, server, category);

      if (sources && sources.sources && sources.sources.length > 0) {
        console.log(`[WS] Success with server: ${server}`);
        // Cache the working server
        await setCachedServer(episodeId, category, server, failedServersThisRequest);
        return {
          ...sources,
          usedServer: server,
          serverIndex: i,
          totalServers,
        };
      }

      console.log(`[WS] No sources from ${server}, trying next...`);
      failedServersThisRequest.push(server);
    } catch (err: any) {
      console.log(`[WS] Error from ${server}: ${err.message}`);
      failedServersThisRequest.push(server);
    }

    // Small delay between retries
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // All servers failed - mark all as failed in cache
  for (const server of failedServersThisRequest) {
    await markServerFailed(episodeId, category, server);
  }

  // Return iframe fallback info
  sendMessage({
    type: 'status',
    message: 'All servers failed. Use iframe fallback.',
  });

  const animeId = episodeId.split('?')[0];
  const epMatch = episodeId.match(/\?ep=(\d+)/);
  const epNum = epMatch ? epMatch[1] : '1';

  return {
    sources: [],
    iframeFallback: `https://megaplay.buzz/embed/s-2/${epNum}/${category}`,
    iframeFallbackAlt: `https://hianime.to/watch/${animeId}?ep=${epNum}`,
    usedServer: 'iframe',
    serverIndex: totalServers,
    totalServers,
  };
}

// Create WebSocket handler for Node.js
export function createWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws/stream' });

  wss.on('connection', (ws: any) => {
    const clientId = Math.random().toString(36).substring(7);
    console.log(`[WS] Client connected: ${clientId}`);

    connections.set(clientId, ws);

    const sendMessage = (msg: StreamResponse) => {
      if (ws.readyState === WS.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    ws.on('message', async (data: any) => {
      try {
        const message: StreamRequest = JSON.parse(data.toString());
        console.log(`[WS] Received:`, message);

        if (message.type === 'get_sources') {
          sendMessage({
            type: 'status',
            message: 'Searching for sources...',
          });

          const sources = await findWorkingSources(
            message.episodeId,
            message.category,
            sendMessage
          );

          if (sources) {
            sendMessage({
              type: 'sources',
              data: sources,
              server: sources.usedServer,
              serverIndex: sources.serverIndex,
              totalServers: sources.totalServers,
              fromCache: sources.fromCache || false,
            });
          } else {
            sendMessage({
              type: 'error',
              message: 'No sources found from any server',
            });
          }
        }
      } catch (err: any) {
        console.error('[WS] Error:', err);
        sendMessage({
          type: 'error',
          message: err.message || 'Unknown error',
        });
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Client disconnected: ${clientId}`);
      connections.delete(clientId);
    });

    ws.on('error', (err: any) => {
      console.error(`[WS] Error for client ${clientId}:`, err);
    });

    // Send welcome message
    sendMessage({
      type: 'status',
      message: `Connected to stream control${isCacheEnabled() ? ' (cache enabled)' : ''}`,
    });
  });

  console.log('[WS] WebSocket server initialized on /ws/stream');
  return wss;
}
