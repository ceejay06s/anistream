import axios from 'axios';
import { Platform } from 'react-native';

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
});

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

    // On web, proxy URLs through backend to handle CORS
    if (Platform.OS === 'web') {
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
    }

    return data;
  },

  getServers: async (episodeId: string) => {
    const response = await api.get('/api/streaming/servers', {
      params: { episodeId },
    });
    return response.data.data || [];
  },
};
