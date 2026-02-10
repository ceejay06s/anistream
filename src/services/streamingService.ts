/**
 * Unified Streaming Service
 * 
 * HiAnime-only streaming service
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 */

import {
  searchHiAnime,
  getHiAnimeInfo,
  getHiAnimeEpisodes,
  getHiAnimeEpisodeSources,
  convertHiAnimeToAnime,
  convertHiAnimeToEpisode,
} from './hianimeService';
import { Anime, Episode } from '../types';

export interface StreamingSource {
  url: string;
  quality: string;
  isM3U8: boolean;
  server?: string;
}

export interface StreamingTrack {
  url: string;
  lang: string;
}

export interface StreamingData {
  sources: StreamingSource[];
  headers?: {
    Referer?: string;
    [key: string]: string | undefined;
  };
  tracks?: StreamingTrack[];
  intro?: {
    start: number;
    end: number;
  };
  outro?: {
    start: number;
    end: number;
  };
}

export interface AnimeSearchResult {
  id: string;
  title: string;
  image: string;
  description?: string;
  source: 'HiAnime';
}

/**
 * Search anime on HiAnime
 */
export const searchAnime = async (query: string): Promise<AnimeSearchResult[]> => {
  const results: AnimeSearchResult[] = [];

  try {
    const hianimeResults = await searchHiAnime(query);
    const formatted = hianimeResults.map((item: any) => ({
      id: item.id || item.animeId || '',
      title: item.title || item.name || '',
      image: item.image || item.img || item.coverImage || '',
      description: item.description || '',
      source: 'HiAnime' as const,
    })).filter((item: any) => item.id && item.title);
    
    results.push(...formatted);
  } catch (error) {
    console.warn('HiAnime search failed:', error);
  }

  return results;
};

/**
 * Get anime information from HiAnime
 */
export const getAnimeInfo = async (
  animeId: string,
  source?: 'HiAnime'
): Promise<{
  anime: Anime;
  episodes: Episode[];
  source: string;
} | null> => {
  try {
    console.log('🔍 Fetching HiAnime info for:', animeId);
    const info = await getHiAnimeInfo(animeId);
    console.log('✅ HiAnime info fetched:', info ? 'success' : 'empty');
    
    console.log('🔍 Fetching HiAnime episodes for:', animeId);
    const episodes = await getHiAnimeEpisodes(animeId);
    console.log('✅ HiAnime episodes fetched:', episodes?.length || 0, 'episodes');
    
    if (!info) {
      console.warn('⚠️ HiAnime info is empty');
      throw new Error('Anime info not found');
    }
    
    const anime = convertHiAnimeToAnime(info);
    const formattedEpisodes = episodes && episodes.length > 0 
      ? episodes.map((ep: any) => convertHiAnimeToEpisode(ep, animeId))
      : [];
    
    console.log('✅ Formatted episodes:', formattedEpisodes.length);

    if (formattedEpisodes.length === 0) {
      console.warn('⚠️ No episodes after formatting');
      throw new Error('No episodes found');
    }

    return {
      anime,
      episodes: formattedEpisodes,
      source: 'HiAnime',
    };
  } catch (error: any) {
    console.warn('❌ HiAnime info fetch failed:', error?.message || error);
    return null;
  }
};

/**
 * Get streaming sources for an episode from HiAnime
 */
export const getStreamingSources = async (
  episodeId: string,
  source?: 'HiAnime'
): Promise<StreamingData | null> => {
  // Validate episode ID
  if (!episodeId || episodeId.length < 3 || episodeId === '1' || episodeId === '0') {
    console.warn('Invalid episode ID format:', episodeId);
    return null;
  }

  try {
    const hianimeResponse = await getHiAnimeEpisodeSources(episodeId);
    
    // Handle different response formats
    let sources: any[] = [];
    let headers: any = {};
    let tracks: StreamingTrack[] = [];
    let intro: { start: number; end: number } | undefined;
    let outro: { start: number; end: number } | undefined;

    // Check if response is an object with data property (from proxy)
    if (hianimeResponse && typeof hianimeResponse === 'object' && !Array.isArray(hianimeResponse)) {
      // Response from proxy: { sources: [], headers: {}, tracks: [], intro: {}, outro: {} }
      sources = hianimeResponse.sources || hianimeResponse.data?.sources || [];
      headers = hianimeResponse.headers || hianimeResponse.data?.headers || {};
      tracks = (hianimeResponse.tracks || hianimeResponse.data?.tracks || []).map((track: any) => ({
        url: track.url || '',
        lang: track.lang || track.label || 'Unknown',
      }));
      intro = hianimeResponse.intro || hianimeResponse.data?.intro;
      outro = hianimeResponse.outro || hianimeResponse.data?.outro;
    } else if (Array.isArray(hianimeResponse)) {
      // Response is just an array of sources
      sources = hianimeResponse;
    }

    // Proxy M3U8 URLs through backend on web to avoid 403 errors
    const PROXY_SERVER_URL = 'http://localhost:1000';
    const isWeb = typeof window !== 'undefined';
    
    const formatted = sources.map((src: any) => {
      let url = src.url || src.file || '';
      
      // On web, proxy M3U8 URLs through backend to handle headers
      if (isWeb && url.includes('.m3u8') && headers.Referer) {
        const proxyUrl = `${PROXY_SERVER_URL}/proxy/m3u8?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(headers.Referer)}`;
        console.log('🔄 Proxying M3U8 through backend:', url.substring(0, 60) + '...');
        url = proxyUrl;
      }
      
      return {
        url,
        quality: src.quality || src.label || 'auto',
        isM3U8: src.isM3U8 !== false && (src.isM3U8 === true || src.url?.includes('.m3u8')),
        server: src.server || 'default',
      };
    }).filter((src: any) => src.url);

    if (formatted.length === 0) {
      console.warn('No streaming sources found for episode:', episodeId);
      return null;
    }

    // Use headers from response, or fallback to default
    const finalHeaders = Object.keys(headers).length > 0 
      ? headers 
      : { Referer: 'https://hianime.to/' };

    const result: StreamingData = {
      sources: formatted,
      headers: finalHeaders,
    };

    // Add optional fields if they exist
    if (tracks.length > 0) {
      result.tracks = tracks;
    }
    if (intro) {
      result.intro = intro;
    }
    if (outro) {
      result.outro = outro;
    }

    return result;
  } catch (error: any) {
    console.warn('HiAnime sources fetch failed:', error?.message || error);
    return null;
  }
};

/**
 * Get recommended source from available sources
 */
export const getRecommendedSource = (sources: StreamingSource[]): StreamingSource | null => {
  if (sources.length === 0) return null;

  // Prefer HLS/M3U8 streams
  const hlsSource = sources.find(s => s.isM3U8);
  if (hlsSource) return hlsSource;

  // Prefer higher quality
  const qualityOrder = ['1080p', '720p', '480p', '360p', 'auto'];
  for (const quality of qualityOrder) {
    const source = sources.find(s => s.quality.toLowerCase() === quality.toLowerCase());
    if (source) return source;
  }

  // Return first available
  return sources[0];
};
