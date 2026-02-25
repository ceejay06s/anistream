import axios, { AxiosError } from 'axios';

// Use environment variable for production, fallback to localhost for development
const getBaseUrl = () => {
  // Check for environment variable (set at build time via EAS or Expo)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Production detection for web builds (Vercel, etc.)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://anistream-backend-blme.onrender.com';
  }
  // Fallback to localhost for development
  return 'http://localhost:8801';
};

export const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Retry logic for failed requests
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as any;

    // Don't retry if no config or already retried max times
    if (!config || config._retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    // Only retry on 500 errors or network errors
    const shouldRetry =
      error.response?.status === 500 ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      !error.response;

    if (!shouldRetry) {
      return Promise.reject(error);
    }

    config._retryCount = (config._retryCount || 0) + 1;

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config._retryCount));

    return api(config);
  }
);

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
  getSources: async (
    episodeId: string,
    server: string = 'hd-1',
    category: string = 'sub'
  ): Promise<StreamingData> => {
    const response = await api.get('/api/streaming/sources', {
      params: { episodeId, server, category, fallback: 'true' },
    });
    const data = response.data.data || { sources: [] };

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
