import axios from 'axios';

// @ts-ignore - Vite env types
export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8801';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Anime {
  id: string;
  name: string;
  poster: string;
  type?: string;
  rating?: string;
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

export interface SearchFilters {
  type?: string;
  status?: string;
  rated?: string;
  score?: string;
  season?: string;
  language?: string;
  sort?: string;
  genres?: string | string[];
  page?: number;
}

// Anime API
export const animeApi = {
  getTrending: async (): Promise<Anime[]> => {
    const response = await api.get('/api/anime/trending');
    return response.data.data || [];
  },

  search: async (query: string, filters?: SearchFilters): Promise<Anime[]> => {
    const params: any = { q: query };
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'genres') {
          // Handle genres array - join if array, or use as string
          if (Array.isArray(value) && value.length > 0) {
            params[key] = value.join(',');
          } else if (value && typeof value === 'string') {
            params[key] = value;
          }
        } else if (value && value !== 'all' && value !== 'default') {
          params[key] = value;
        }
      });
    }
    const response = await api.get('/api/anime/search', { params });
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
};

// Streaming API
export const streamingApi = {
  getSources: async (
    episodeId: string,
    server: string = 'hd-1',
    category: string = 'sub',
    fallback: boolean = true
  ): Promise<StreamingData> => {
    const response = await api.get('/api/streaming/sources', {
      params: { episodeId, server, category, fallback: fallback.toString() },
    });
    const data = response.data.data || { sources: [] };

    // Log which server succeeded
    if (response.data.server) {
      console.log(`Sources loaded from server: ${response.data.server}`);
    }

    // Proxy m3u8 URLs through backend to avoid CORS
    if (data.sources) {
      data.sources = data.sources.map((source: StreamingSource) => {
        if (source.isM3U8 && source.url) {
          // Use proxy endpoint for m3u8 files
          const proxyUrl = `${API_BASE_URL}/api/streaming/proxy?url=${encodeURIComponent(source.url)}`;
          return { ...source, url: proxyUrl };
        }
        return source;
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

  getEmbedURL: async (episodeId: string, server: string = 'hd-2'): Promise<string | null> => {
    try {
      const response = await api.get('/api/streaming/embed', {
        params: { episodeId, server },
      });
      return response.data.embedURL || null;
    } catch (error) {
      console.error('Failed to get embed URL:', error);
      return null;
    }
  },
};
