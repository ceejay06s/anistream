import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL, StreamingData, StreamingSource } from '../services/api';

export interface StreamStatus {
  isConnected: boolean;
  isLoading: boolean;
  message: string | null;
  currentServer: string | null;
  serverIndex: number;
  totalServers: number;
  error: string | null;
  iframeFallback: string | null;
  fromCache: boolean;
}

export interface UseStreamSocketResult {
  status: StreamStatus;
  streamingData: StreamingData | null;
  selectedSource: StreamingSource | null;
  requestSources: (episodeId: string, category: 'sub' | 'dub') => void;
  disconnect: () => void;
  retry: () => void;
}

interface WSMessage {
  type: 'sources' | 'status' | 'error' | 'retry';
  data?: any;
  message?: string;
  server?: string;
  serverIndex?: number;
  totalServers?: number;
  fromCache?: boolean;
}

export function useStreamSocket(): UseStreamSocketResult {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestRef = useRef<{ episodeId: string; category: 'sub' | 'dub' } | null>(null);

  const [status, setStatus] = useState<StreamStatus>({
    isConnected: false,
    isLoading: false,
    message: null,
    currentServer: null,
    serverIndex: 0,
    totalServers: 0,
    error: null,
    iframeFallback: null,
    fromCache: false,
  });

  const [streamingData, setStreamingData] = useState<StreamingData | null>(null);
  const [selectedSource, setSelectedSource] = useState<StreamingSource | null>(null);

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    const httpUrl = API_BASE_URL;
    const wsUrl = httpUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    return `${wsUrl}/ws/stream`;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = getWsUrl();
    console.log('[WS] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] Connected');
        setStatus(prev => ({
          ...prev,
          isConnected: true,
          error: null,
        }));

        // If there was a pending request, send it
        if (lastRequestRef.current) {
          const { episodeId, category } = lastRequestRef.current;
          ws.send(JSON.stringify({
            type: 'get_sources',
            episodeId,
            category,
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          console.log('[WS] Message:', message);

          switch (message.type) {
            case 'status':
              setStatus(prev => ({
                ...prev,
                message: message.message || null,
                totalServers: message.totalServers || prev.totalServers,
              }));
              break;

            case 'retry':
              setStatus(prev => ({
                ...prev,
                message: message.message || null,
                currentServer: message.server || null,
                serverIndex: message.serverIndex ?? prev.serverIndex,
                totalServers: message.totalServers ?? prev.totalServers,
              }));
              break;

            case 'sources':
              if (message.data) {
                // Proxy M3U8 URLs through backend for all platforms
                // Web needs this for CORS, mobile needs it because some servers block direct access
                let sources = message.data.sources || [];
                sources = sources.map((source: StreamingSource) => {
                  if (source.isM3U8 && source.url) {
                    const proxyUrl = `${API_BASE_URL}/api/streaming/proxy?url=${encodeURIComponent(source.url)}`;
                    return { ...source, url: proxyUrl };
                  }
                  return source;
                });

                // Proxy subtitle track URLs for all platforms
                let tracks = message.data.tracks || [];
                if (tracks.length > 0) {
                  tracks = tracks.map((track: { url: string; lang: string }) => {
                    if (track.url) {
                      const proxyUrl = `${API_BASE_URL}/api/streaming/proxy?url=${encodeURIComponent(track.url)}`;
                      return { ...track, url: proxyUrl };
                    }
                    return track;
                  });
                }

                const data: StreamingData = {
                  sources,
                  tracks,
                  intro: message.data.intro,
                  outro: message.data.outro,
                };

                // Check if we got an iframe fallback (no sources but iframe URL)
                const iframeFallback = message.data.iframeFallback || null;

                setStatus(prev => ({
                  ...prev,
                  isLoading: false,
                  message: sources.length === 0 && iframeFallback
                    ? 'Using iframe fallback'
                    : message.fromCache ? 'Loaded from cache' : null,
                  currentServer: message.server || null,
                  serverIndex: message.serverIndex ?? 0,
                  totalServers: message.totalServers ?? 0,
                  iframeFallback,
                  error: sources.length === 0 && !iframeFallback ? 'No sources available' : null,
                  fromCache: message.fromCache || false,
                }));

                setStreamingData(data);
                if (sources.length > 0) {
                  setSelectedSource(sources[0]);
                }
              }
              break;

            case 'error':
              setStatus(prev => ({
                ...prev,
                isLoading: false,
                error: message.message || 'Unknown error',
              }));
              break;
          }
        } catch (err) {
          console.error('[WS] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          error: 'Connection error',
        }));
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setStatus(prev => ({
          ...prev,
          isConnected: false,
        }));

        // Try to reconnect after 2 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (lastRequestRef.current) {
            connect();
          }
        }, 2000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Connection error:', err);
      setStatus(prev => ({
        ...prev,
        error: 'Failed to connect',
      }));
    }
  }, [getWsUrl]);

  // Request sources via WebSocket
  const requestSources = useCallback((episodeId: string, category: 'sub' | 'dub') => {
    lastRequestRef.current = { episodeId, category };

    setStatus(prev => ({
      ...prev,
      isLoading: true,
      message: 'Connecting...',
      error: null,
    }));
    setStreamingData(null);
    setSelectedSource(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'get_sources',
        episodeId,
        category,
      }));
    } else {
      connect();
    }
  }, [connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    lastRequestRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setStatus({
      isConnected: false,
      isLoading: false,
      message: null,
      currentServer: null,
      serverIndex: 0,
      totalServers: 0,
      error: null,
      iframeFallback: null,
      fromCache: false,
    });
  }, []);

  // Retry last request
  const retry = useCallback(() => {
    if (lastRequestRef.current) {
      const { episodeId, category } = lastRequestRef.current;
      requestSources(episodeId, category);
    }
  }, [requestSources]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    streamingData,
    selectedSource,
    requestSources,
    disconnect,
    retry,
  };
}
