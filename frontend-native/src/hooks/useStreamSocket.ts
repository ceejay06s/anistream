import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { API_BASE_URL, StreamingData, StreamingSource, electBackendForWebSocket } from '../services/api';

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
  requestSources: (episodeId: string, category: 'sub' | 'dub', options?: { skipCache?: boolean; failedServer?: string }) => void;
  disconnect: () => void;
  retry: (options?: { skipCache?: boolean; failedServer?: string }) => void;
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

const WS_CONNECT_TIMEOUT_MS = 12000;
const WS_SOURCES_TIMEOUT_MS = 50000;

export function useStreamSocket(): UseStreamSocketResult {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourcesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef<{ episodeId: string; category: 'sub' | 'dub'; skipCache?: boolean; failedServer?: string } | null>(null);

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

  // Connect to WebSocket (on native, elect best backend first so WS uses parallel backends)
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        await Promise.race([
          electBackendForWebSocket(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Backend election timeout')), 6000)),
        ]);
      } catch {
        // Keep current API_BASE_URL
      }
    }

    const wsUrl = getWsUrl();
    console.log('[WS] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      connectTimeoutRef.current = setTimeout(() => {
        connectTimeoutRef.current = null;
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setStatus(prev => ({
            ...prev,
            isLoading: false,
            error: 'Connection timed out. Try "Use REST API" below.',
          }));
        }
      }, WS_CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        console.log('[WS] Connected');
        setStatus(prev => ({
          ...prev,
          isConnected: true,
          error: null,
          message: 'Finding servers...',
        }));

        if (lastRequestRef.current) {
          const { episodeId, category, skipCache, failedServer } = lastRequestRef.current;
          ws.send(JSON.stringify({
            type: 'get_sources',
            episodeId,
            category,
            skipCache: skipCache === true,
            failedServer: failedServer || undefined,
          }));
          sourcesTimeoutRef.current = setTimeout(() => {
            sourcesTimeoutRef.current = null;
            setStatus(prev => {
              if (prev.isLoading) {
                return { ...prev, isLoading: false, error: 'Servers took too long. Try "Use REST API" or retry.' };
              }
              return prev;
            });
          }, WS_SOURCES_TIMEOUT_MS);
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
              if (sourcesTimeoutRef.current) {
                clearTimeout(sourcesTimeoutRef.current);
                sourcesTimeoutRef.current = null;
              }
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
              if (sourcesTimeoutRef.current) {
                clearTimeout(sourcesTimeoutRef.current);
                sourcesTimeoutRef.current = null;
              }
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
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        console.error('[WS] Error:', error);
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          error: 'Connection error',
        }));
      };

      ws.onclose = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        if (sourcesTimeoutRef.current) {
          clearTimeout(sourcesTimeoutRef.current);
          sourcesTimeoutRef.current = null;
        }
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
  const requestSources = useCallback((episodeId: string, category: 'sub' | 'dub', options?: { skipCache?: boolean; failedServer?: string }) => {
    lastRequestRef.current = { episodeId, category, skipCache: options?.skipCache, failedServer: options?.failedServer };

    setStatus(prev => ({
      ...prev,
      isLoading: true,
      message: options?.skipCache ? 'Trying next server...' : 'Connecting...',
      error: null,
    }));
    setStreamingData(null);
    setSelectedSource(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'get_sources',
        episodeId,
        category,
        skipCache: options?.skipCache === true,
        failedServer: options?.failedServer || undefined,
      }));
      if (sourcesTimeoutRef.current) clearTimeout(sourcesTimeoutRef.current);
      sourcesTimeoutRef.current = setTimeout(() => {
        sourcesTimeoutRef.current = null;
        setStatus(prev => {
          if (prev.isLoading) {
            return { ...prev, isLoading: false, error: 'Servers took too long. Try "Use REST API" or retry.' };
          }
          return prev;
        });
      }, WS_SOURCES_TIMEOUT_MS);
    } else {
      connect();
    }
  }, [connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (sourcesTimeoutRef.current) {
      clearTimeout(sourcesTimeoutRef.current);
      sourcesTimeoutRef.current = null;
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

  // Retry last request (e.g. after playback error). skipCache: true + failedServer avoid returning same stream in a loop.
  const retry = useCallback((options?: { skipCache?: boolean; failedServer?: string }) => {
    if (lastRequestRef.current) {
      const { episodeId, category } = lastRequestRef.current;
      requestSources(episodeId, category, options);
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
