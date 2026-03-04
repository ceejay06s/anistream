import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';

const DEFAULT_PRIMARY_API_URL = 'https://anistream-backend-blme.onrender.com';
const DEFAULT_BACKUP_API_URL = 'https://anistream-production-79aa.up.railway.app';

function getPrimaryUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_PRIMARY_API_URL;
}

/** Backup API URLs; use ";" as separator in EXPO_PUBLIC_BACKUP_API_URL. */
function getBackupUrls(): string[] {
  const raw = process.env.EXPO_PUBLIC_BACKUP_API_URL?.trim() || '';
  if (!raw) return [DEFAULT_BACKUP_API_URL];
  return raw.split(';').map((u) => u.trim()).filter(Boolean);
}

function isParallelBackendsEnabled(): boolean {
  const v = (process.env.EXPO_PUBLIC_USE_PARALLEL_BACKENDS ?? '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

// Use env or default primary; localhost when dev
function getInitialBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL?.trim()) {
    return process.env.EXPO_PUBLIC_API_URL.trim();
  }
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return DEFAULT_PRIMARY_API_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname !== 'localhost' && window.location?.hostname !== '127.0.0.1') {
    return DEFAULT_PRIMARY_API_URL;
  }
  return 'http://localhost:8801';
}

// Mutable so we can switch to backup when primary fails; consumers read current value
export let API_BASE_URL = getInitialBaseUrl();

const useBackup = (): boolean => {
  const primary = getPrimaryUrl();
  const backups = getBackupUrls().filter((u) => u !== primary);
  return getInitialBaseUrl() === primary && backups.length > 0;
};

/** Whether to hit primary + all backups in parallel and use first success. */
const useParallelBackends = (): boolean => isParallelBackendsEnabled() && useBackup();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s for slow backend/aniwatch proxy
});

// Retry logic for failed requests
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as any;

    if (!config) {
      return Promise.reject(error);
    }

    const retriable =
      !error.response ||
      error.response.status === 500 ||
      error.response.status === 502 ||
      error.response.status === 503 ||
      error.response.status === 504;

    // If primary failed and we have backups, try all backups in parallel once
    if (
      retriable &&
      useBackup() &&
      API_BASE_URL === getPrimaryUrl() &&
      !config._triedBackup
    ) {
      config._triedBackup = true;
      const backups = getBackupUrls().filter((u) => u !== getPrimaryUrl());
      if (backups.length === 0) return Promise.reject(error);
      if (backups.length === 1) {
        API_BASE_URL = backups[0];
        api.defaults.baseURL = backups[0];
        return api(config);
      }
      try {
        const path = (config.url || '').replace(config.baseURL || '', '') || '/';
        const response = await Promise.any(
          backups.map((baseURL) => api.get(path, { ...config, baseURL, params: config.params }))
        );
        const winner = response.config?.baseURL;
        if (winner) {
          API_BASE_URL = winner;
          api.defaults.baseURL = winner;
        }
        return response;
      } catch {
        return Promise.reject(error);
      }
    }

    // Standard retry: same host
    if (config._retryCount >= MAX_RETRIES || !retriable) {
      return Promise.reject(error);
    }

    config._retryCount = (config._retryCount || 0) + 1;
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config._retryCount));
    return api(config);
  }
);

/**
 * Run the same GET request against primary + all backup backends in parallel;
 * return the first successful response and set API_BASE_URL to the winner.
 */
async function getWithParallelBackends(path: string, config: { params?: Record<string, string> }): Promise<any> {
  const primary = getPrimaryUrl();
  const backups = getBackupUrls().filter((u) => u !== primary);
  const urls = [primary, ...backups];
  if (urls.length <= 1) {
    return api.get(path, { ...config, params: config.params });
  }
  const req = (baseURL: string) =>
    api.get(path, { ...config, baseURL, params: config.params });
  try {
    const response = await Promise.any(urls.map((url) => req(url)));
    const winnerBase = response.config?.baseURL;
    if (winnerBase) {
      API_BASE_URL = winnerBase;
      api.defaults.baseURL = winnerBase;
    }
    return response;
  } catch {
    throw new Error('All API backends failed');
  }
}

export interface Anime {
  id: string;
  name: string;
  poster: string;
  type?: string;
  rating?: string;
}

export interface VoiceActor {
  character: {
    id: string;
    name: string;
    poster: string;
  };
  voiceActor: {
    id: string;
    name: string;
    poster: string;
  };
}

export interface Studio {
  id: string;
  name: string;
}

export interface RelatedAnime {
  id: string;
  name: string;
  poster: string;
  type?: string;
  episodes?: { sub: number | null; dub: number | null };
}

export interface AnimeInfo {
  id: string;
  name: string;
  description: string;
  poster: string;
  genres: string[];
  episodes: {
    sub: number | null;
    dub: number | null;
  };
  rating?: string;
  type?: string;
  // Extended info
  japanese?: string;
  aired?: string;
  premiered?: string;
  duration?: string;
  status?: string;
  studios?: Studio[];
  producers?: string[];
  characters?: VoiceActor[];
  relatedAnime?: RelatedAnime[];
  recommendedAnime?: RelatedAnime[];
  seasons?: RelatedAnime[];
}

export interface Episode {
  episodeId: string;
  number: number;
  title: string;
}

export interface StreamingSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface StreamingData {
  sources: StreamingSource[];
  headers?: Record<string, string>;
  tracks?: Array<{ url: string; lang: string }>;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  embedURL?: string;
}

// Anime API
export const animeApi = {
  getTrending: async (): Promise<Anime[]> => {
    const response = await api.get('/api/anime/trending');
    return response.data.data || [];
  },

  search: async (query: string): Promise<Anime[]> => {
    const response = await api.get('/api/anime/search', {
      params: { q: query },
    });
    return response.data.data || [];
  },

  getInfo: async (animeId: string): Promise<AnimeInfo | null> => {
    const response = await api.get(`/api/anime/info/${animeId}`);
    return response.data.data || null;
  },

  getEpisodes: async (animeId: string): Promise<Episode[]> => {
    const response = await api.get(`/api/anime/episodes/${animeId}`);
    return response.data.data || [];
  },

  getByCategory: async (category: string, page: number = 1): Promise<Anime[]> => {
    const response = await api.get(`/api/anime/category/${category}`, {
      params: { page },
    });
    return response.data.data || [];
  },

  getByGenre: async (genre: string, page: number = 1): Promise<Anime[]> => {
    const response = await api.get(`/api/anime/genre/${genre}`, {
      params: { page },
    });
    return response.data.data || [];
  },

  getByAZ: async (letter: string, page: number = 1): Promise<Anime[]> => {
    const response = await api.get(`/api/anime/az/${letter}`, {
      params: { page },
    });
    return response.data.data || [];
  },

  searchWithFilters: async (
    query: string,
    filters: Record<string, string> = {}
  ): Promise<Anime[]> => {
    const response = await api.get('/api/anime/filter', {
      params: { q: query, ...filters },
    });
    return response.data.data || [];
  },
};

// Streaming API
export const streamingApi = {
  /** Get streaming sources. Uses parallel server tries by default (capped on backend to avoid flooding). */
  getSources: async (
    episodeId: string,
    server: string = 'hd-1',
    category: string = 'sub',
    options?: { fallback?: boolean; parallel?: boolean; parallelBackends?: boolean }
  ): Promise<StreamingData> => {
    const fallback = options?.fallback !== false;
    const parallel = options?.parallel !== false;
    const parallelBackends = options?.parallelBackends !== false && useParallelBackends();
    const params = {
      episodeId,
      server,
      category,
      fallback: fallback ? 'true' : 'false',
      ...(fallback && { parallel: parallel ? 'true' : 'false' }),
    };
    const response = parallelBackends
      ? await getWithParallelBackends('/api/streaming/sources', { params })
      : await api.get('/api/streaming/sources', { params });
    const data = response.data.data || { sources: [] };

    // Proxy URLs use API_BASE_URL (set to winner when parallelBackends was used)
    // Proxy URLs through backend to handle CORS and required headers
    // This is needed for both web (CORS) and mobile (some servers block direct access)
    // Proxy video sources
    if (data.sources) {
      data.sources = data.sources.map((source: StreamingSource) => {
        if (source.isM3U8 && source.url) {
          const proxyUrl = `${API_BASE_URL}/api/streaming/proxy?url=${encodeURIComponent(source.url)}`;
          return { ...source, url: proxyUrl };
        }
        return source;
      });
    }
    // Proxy subtitle tracks
    if (data.tracks) {
      data.tracks = data.tracks.map((track: { url: string; lang: string }) => {
        if (track.url) {
          const proxyUrl = `${API_BASE_URL}/api/streaming/proxy?url=${encodeURIComponent(track.url)}`;
          return { ...track, url: proxyUrl };
        }
        return track;
      });
    }

    return data;
  },

  getServers: async (episodeId: string) => {
    const response = await api.get('/api/streaming/servers', {
      params: { episodeId },
    });
    return response.data.data || [];
  },

  getEmbedUrl: async (
    episodeId: string,
    server: string = 'hd-2',
    category: string = 'sub'
  ): Promise<string | null> => {
    try {
      const response = await api.get('/api/streaming/embed', {
        params: { episodeId, server, category },
      });
      return response.data?.embedURL || null;
    } catch (error) {
      console.warn('Failed to fetch embed URL:', error);
      return null;
    }
  },
};
