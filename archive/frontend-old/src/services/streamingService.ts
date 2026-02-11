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
  url?: string; // URL may contain full ID with numeric suffix
}

/**
 * Search anime on HiAnime
 */
export const searchAnime = async (query: string): Promise<AnimeSearchResult[]> => {
  const results: AnimeSearchResult[] = [];

  try {
    const hianimeResults = await searchHiAnime(query);
    const formatted = hianimeResults.map((item: any) => {
      // Extract full ID from URL if available (includes numeric suffix)
      // URL format: https://hianimez.to/watch/frieren-beyond-journeys-end-season-2-20409
      let fullId = item.id || item.animeId || '';
      
      // Always try to extract ID from URL if available (URLs often have the full ID with numeric suffix)
      if (item.url && item.url.includes('/watch/')) {
        const urlMatch = item.url.match(/\/watch\/([^/?]+)/);
        if (urlMatch && urlMatch[1]) {
          const urlId = urlMatch[1];
          // Prefer URL ID if:
          // 1. It has numeric suffix and current ID doesn't, OR
          // 2. URL ID is longer/more complete (likely has suffix)
          if (urlId.match(/-\d{3,}$/) && !fullId.match(/-\d{3,}$/)) {
            fullId = urlId;
            console.log(`📌 Extracted full ID from URL: ${fullId} (original: ${item.id})`);
          } else if (urlId.length > fullId.length && urlId.startsWith(fullId)) {
            // URL ID is longer and starts with current ID - likely has suffix
            fullId = urlId;
            console.log(`📌 Using longer ID from URL: ${fullId} (original: ${item.id})`);
          }
        }
      }
      
      return {
        id: fullId,
        title: item.title || item.name || '',
        image: item.image || item.img || item.coverImage || '',
        description: item.description || '',
        source: 'HiAnime' as const,
        url: item.url || '',
      };
    }).filter((item: any) => item.id && item.title);
    
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
    
    // Try with original ID first (may have numeric suffix)
    let info = await getHiAnimeInfo(animeId);
    
    // If that fails and ID doesn't have numeric suffix, try with cleaned ID
    if (!info && animeId.match(/-\d{3,}$/)) {
      const cleanedId = animeId.replace(/-\d{3,}$/, '');
      console.log(`🔄 Info fetch failed with full ID, trying cleaned ID: ${cleanedId}`);
      info = await getHiAnimeInfo(cleanedId);
    }
    
    console.log('✅ HiAnime info fetched:', info ? 'success' : 'empty');
    
    if (!info) {
      console.warn('⚠️ HiAnime info is empty for ID:', animeId);
      return null;
    }
    
    const anime = convertHiAnimeToAnime(info);
    
    console.log('🔍 Fetching HiAnime episodes for:', animeId);
    
    // Try episodes with original ID first
    let episodes = await getHiAnimeEpisodes(animeId);
    
    // If no episodes and ID has numeric suffix, try without it
    if (episodes.length === 0 && animeId.match(/-\d{3,}$/)) {
      const cleanedId = animeId.replace(/-\d{3,}$/, '');
      console.log(`🔄 Episodes fetch failed with full ID, trying cleaned ID: ${cleanedId}`);
      episodes = await getHiAnimeEpisodes(cleanedId);
    }
    
    // If still no episodes, try the other way (add numeric suffix if missing)
    if (episodes.length === 0 && !animeId.match(/-\d{3,}$/)) {
      // Try common numeric suffixes (this is a fallback - not ideal but better than nothing)
      const commonSuffixes = ['-100', '-1', '-2'];
      for (const suffix of commonSuffixes) {
        const idWithSuffix = animeId + suffix;
        console.log(`🔄 Trying ID with suffix: ${idWithSuffix}`);
        episodes = await getHiAnimeEpisodes(idWithSuffix);
        if (episodes.length > 0) {
          console.log(`✅ Found episodes with suffix ${suffix}`);
          break;
        }
      }
    }
    
    console.log('✅ HiAnime episodes fetched:', episodes?.length || 0, 'episodes');
    
    const formattedEpisodes = episodes && episodes.length > 0 
      ? episodes.map((ep: any) => convertHiAnimeToEpisode(ep, animeId))
      : [];
    
    console.log('✅ Formatted episodes:', formattedEpisodes.length);

    // Return even if episodes are empty - let the caller decide what to do
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

    // Get referer from headers (case-insensitive)
    const referer = headers.Referer || headers.referer || 'https://megacloud.blog/';

    const formatted = sources.map((src: any) => {
      let url = src.url || src.file || '';

      // On web, ALWAYS proxy M3U8 URLs through backend to handle headers and segment rewriting
      if (isWeb && url.includes('.m3u8')) {
        const proxyUrl = `${PROXY_SERVER_URL}/proxy/m3u8?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`;
        console.log('🔄 Proxying M3U8 through backend:', url.substring(0, 60) + '...');
        console.log('   Referer:', referer);
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
