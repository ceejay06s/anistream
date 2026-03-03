import { WebSocket as WS, WebSocketServer } from 'ws';
import { resolveEpisodeSources } from '../services/streamResolver.js';
import { isCacheEnabled } from '../services/streamCache.js';

export interface StreamRequest {
  type: 'get_sources';
  episodeId: string;
  category: 'sub' | 'dub';
  clientId: string;
}

export interface StreamResponse {
  type: 'sources' | 'status' | 'error';
  data?: any;
  message?: string;
  server?: string;
  triedServers?: string[];
  fromCache?: boolean;
}

function buildIframeFallback(episodeId: string, category: 'sub' | 'dub') {
  const animeId = episodeId.split('?')[0];
  const epMatch = episodeId.match(/\?ep=(\d+)/);
  const episodeNumber = epMatch ? epMatch[1] : '1';

  return {
    sources: [],
    iframeFallback: `https://megaplay.buzz/embed/s-2/${episodeNumber}/${category}`,
    iframeFallbackAlt: `https://hianime.to/watch/${animeId}?ep=${episodeNumber}`,
  };
}

export function createWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws/stream' });

  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(7);
    console.log(`[WS] Client connected: ${clientId}`);

    const send = (payload: StreamResponse) => {
      if (ws.readyState === WS.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    ws.on('message', async (rawData) => {
      try {
        const message: StreamRequest = JSON.parse(rawData.toString());
        if (message.type !== 'get_sources') {
          return;
        }

        send({ type: 'status', message: 'Resolving stream sources...' });

        const result = await resolveEpisodeSources({
          episodeId: message.episodeId,
          category: message.category,
          fallback: true,
        });

        if (result.success) {
          send({
            type: 'sources',
            data: result.data,
            server: result.server,
            triedServers: result.triedServers,
            fromCache: result.fromCache || false,
          });
          return;
        }

        send({
          type: 'sources',
          data: buildIframeFallback(message.episodeId, message.category),
          server: 'iframe',
          triedServers: result.triedServers,
        });
      } catch (error: any) {
        console.error('[WS] Error:', error);
        send({
          type: 'error',
          message: error.message || 'Unknown error',
        });
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`[WS] Error for client ${clientId}:`, error);
    });

    send({
      type: 'status',
      message: `Connected to stream control${isCacheEnabled() ? ' (cache enabled)' : ''}`,
    });
  });

  console.log('[WS] WebSocket server initialized on /ws/stream');
  return wss;
}
