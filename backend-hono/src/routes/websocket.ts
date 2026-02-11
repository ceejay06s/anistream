import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { getEpisodeSources, getEpisodeServers } from '../services/streamingService';
import { WebSocketServer, WebSocket as WS } from 'ws';

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
}

// Server priority for streaming
const SERVER_PRIORITY = ['hd-1', 'hd-2', 'megacloud', 'streamsb', 'streamtape'];

// Try to get working sources by cycling through servers
async function findWorkingSources(
  episodeId: string,
  category: 'sub' | 'dub',
  sendMessage: (msg: StreamResponse) => void
): Promise<any> {
  // First, get available servers for this episode
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

  sendMessage({
    type: 'status',
    message: `Found ${servers.length} servers`,
    totalServers: servers.length,
  });

  // Try each server until one works
  for (let i = 0; i < servers.length; i++) {
    const server = servers[i];

    sendMessage({
      type: 'retry',
      message: `Trying server: ${server.toUpperCase()}`,
      server,
      serverIndex: i,
      totalServers: servers.length,
    });

    try {
      console.log(`[WS] Trying server ${i + 1}/${servers.length}: ${server}`);
      const sources = await getEpisodeSources(episodeId, server, category);

      if (sources && sources.sources && sources.sources.length > 0) {
        console.log(`[WS] Success with server: ${server}`);
        return {
          ...sources,
          usedServer: server,
          serverIndex: i,
          totalServers: servers.length,
        };
      }

      console.log(`[WS] No sources from ${server}, trying next...`);
    } catch (err: any) {
      console.log(`[WS] Error from ${server}: ${err.message}`);
    }

    // Small delay between retries
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // All servers failed - return iframe fallback info
  sendMessage({
    type: 'status',
    message: 'All servers failed. Use iframe fallback.',
  });

  // Return iframe URL as fallback (using megaplay.buzz like Kitsune)
  const animeId = episodeId.split('?')[0];
  const epMatch = episodeId.match(/\?ep=(\d+)/);
  const epNum = epMatch ? epMatch[1] : '1';

  return {
    sources: [],
    // megaplay.buzz format: /stream/s-2/{episodeNumber}/{category}
    iframeFallback: `https://megaplay.buzz/embed/s-2/${epNum}/${category}`,
    iframeFallbackAlt: `https://hianime.to/watch/${animeId}?ep=${epNum}`,
    usedServer: 'iframe',
    serverIndex: servers.length,
    totalServers: servers.length,
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
      message: 'Connected to stream control',
    });
  });

  console.log('[WS] WebSocket server initialized on /ws/stream');
  return wss;
}
