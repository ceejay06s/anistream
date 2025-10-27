/**
 * Streaming API Service - AniWatch Only
 * 
 * Simplified streaming service using only AniWatch scraping
 * Source: https://aniwatchtv.to/
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 * Web scraping functionality is for educational purposes only.
 * For production, use official APIs or get proper licensing.
 */

import {
  searchAniwatchAnime,
  getAniwatchAnimeInfo,
  getAniwatchStreamSources,
  getAniwatchHome,
  AniwatchAnime,
  AniwatchEpisode,
  AniwatchStreamSource,
  aniwatchRateLimiter,
} from './aniwatchScraper';

import {
  searchShafilmAnime,
  scrapeShafilmEpisodes,
  ShafilmAnime,
  ShafilmEpisode,
} from './shafilmScraper';

import {
  scrapeGogoanimeSearch,
  scrapeAnimeInfo as scrapeGogoanimeInfo,
  scrapeVideoSources as scrapeGogoanimeVideoSources,
} from './scrapingService';

export interface StreamingSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface StreamingData {
  headers?: {
    Referer?: string;
    [key: string]: string | undefined;
  };
  sources: StreamingSource[];
  download?: string;
}

export interface Episode {
  id: string;
  number: number;
  title?: string;
  image?: string;
  description?: string;
  url?: string;
}

export interface AnimeStreamingInfo {
  id: string;
  title: string;
  image?: string;
  description?: string;
  genres?: string[];
  releaseDate?: string;
  status?: string;
  totalEpisodes?: number;
  episodes: Episode[];
}

/**
 * Search for anime on AniWatch (with Shafilm fallback)
 */
export const searchAnimeForStreaming = async (query: string): Promise<any[]> => {
  try {
    console.log('Searching AniWatch for:', query);
    
    const results = await aniwatchRateLimiter.add(() => 
      searchAniwatchAnime(query)
    );
    
    // Convert to standard format
    const formattedResults = results.map((anime: AniwatchAnime) => ({
      id: anime.id,
      title: anime.title,
      url: anime.url,
      image: anime.image,
      description: anime.description,
      source: 'AniWatch',
      type: anime.type,
      rating: anime.rating,
      duration: anime.duration,
    }));
    
    console.log(`Found ${formattedResults.length} results from AniWatch`);
    
    // If no results from AniWatch, try Shafilm as fallback
    if (formattedResults.length === 0) {
      console.log('No AniWatch results, trying Shafilm fallback...');
      
      try {
        const shafilmResults = await searchShafilmAnime(query);
        
        if (shafilmResults.length > 0) {
          const shafilmFormatted = shafilmResults.map((anime: ShafilmAnime) => ({
            id: anime.folderName, // Use folder name as ID
            title: anime.title,
            url: anime.url,
            image: undefined, // Shafilm doesn't have thumbnails
            description: undefined,
            source: 'Shafilm',
            type: 'File Server',
            folderName: anime.folderName, // Keep folder name for later use
          }));
          
          console.log(`Found ${shafilmFormatted.length} results from Shafilm`);
          return shafilmFormatted;
        }
      } catch (shafilmError) {
        console.error('Shafilm fallback failed:', shafilmError);
      }
      
      // If Shafilm also failed, try GoGoAnime as final fallback
      console.log('No Shafilm results, trying GoGoAnime fallback...');
      
      try {
        const gogoanimeResults = await scrapeGogoanimeSearch(query);
        
        const gogoanimeFormatted = gogoanimeResults.map((anime: any) => ({
          id: anime.id,
          title: anime.title,
          url: anime.url,
          image: anime.image,
          description: undefined,
          source: 'GoGoAnime',
          type: 'Streaming',
        }));
        
        console.log(`Found ${gogoanimeFormatted.length} results from GoGoAnime`);
        return gogoanimeFormatted;
      } catch (gogoanimeError) {
        console.error('GoGoAnime fallback failed:', gogoanimeError);
        return [];
      }
    }
    
    return formattedResults;
  } catch (error) {
    console.error('Error searching AniWatch:', error);
    return [];
  }
};

/**
 * Get anime info and episodes (supports AniWatch, Shafilm, and GoGoAnime)
 */
export const getAnimeStreamingInfo = async (animeId: string, source?: string): Promise<AnimeStreamingInfo | null> => {
  try {
    console.log('Fetching anime info for:', animeId, 'Source:', source || 'AniWatch');
    
    // Check if this is a GoGoAnime source
    if (source === 'GoGoAnime') {
      console.log('Detected GoGoAnime source, fetching from scraper...');
      
      try {
        const info = await scrapeGogoanimeInfo(animeId);
        
        if (!info) {
          return null;
        }
        
        return {
          id: info.id,
          title: info.title,
          image: info.image,
          description: info.description,
          genres: [],
          releaseDate: undefined,
          status: 'Available',
          totalEpisodes: info.totalEpisodes,
          episodes: info.episodes.map((ep) => ({
            id: ep.id,
            number: ep.number,
            title: ep.title,
            image: undefined,
            description: undefined,
            url: ep.url,
          })),
        };
      } catch (gogoanimeError) {
        console.error('Error fetching from GoGoAnime:', gogoanimeError);
        return null;
      }
    }
    
    // Check if this is a Shafilm source (folder name contains dots/special chars)
    const isShafilmSource = source === 'Shafilm' || (animeId.includes('.') && !source);
    
    if (isShafilmSource) {
      console.log('Detected Shafilm source, fetching from file server...');
      
      try {
        const episodes = await scrapeShafilmEpisodes(animeId);
        
        return {
          id: animeId,
          title: animeId.replace(/[\._]/g, ' ').trim(),
          image: undefined,
          description: 'Available on Shafilm file server',
          genres: [],
          releaseDate: undefined,
          status: 'Available',
          totalEpisodes: episodes.length,
          episodes: episodes.map((ep: ShafilmEpisode) => ({
            id: ep.id,
            number: ep.number,
            title: ep.title,
            image: undefined,
            description: `${ep.quality || ''} ${ep.size || ''}`.trim(),
            url: ep.url, // Direct video URL
          })),
        };
      } catch (shafilmError) {
        console.error('Error fetching from Shafilm:', shafilmError);
        return null;
      }
    }
    
    // Otherwise, use AniWatch
    const info = await aniwatchRateLimiter.add(() => 
      getAniwatchAnimeInfo(animeId)
    );
    
    if (!info) {
      return null;
    }
    
    return {
      id: info.anime.id,
      title: info.anime.title,
      image: info.anime.image,
      description: info.anime.description,
      genres: [],
      releaseDate: undefined,
      status: undefined,
      totalEpisodes: info.anime.totalEpisodes || info.episodes.length,
      episodes: info.episodes.map((ep: AniwatchEpisode) => ({
        id: ep.id,
        number: ep.number,
        title: ep.title,
        image: undefined,
        description: ep.type,
        url: ep.url,
      })),
    };
  } catch (error) {
    console.error('Error fetching anime info:', error);
    return null;
  }
};

/**
 * Get streaming sources for a specific episode
 */
export const getStreamingSources = async (
  episodeId: string,
  source?: string,
  folderName?: string,
  productId?: string,
  magnet?: string,
  episodeUrl?: string
): Promise<StreamingData | null> => {
  try {
    console.log('Fetching streaming sources for:', episodeId);
    console.log('Source:', source, 'Episode URL:', episodeUrl?.substring(0, 100));
    
    // Check if this is a GoGoAnime source
    if (source === 'GoGoAnime' || episodeId.includes('gogoanime') || episodeId.includes('-episode-')) {
      console.log('Detected GoGoAnime source, fetching video sources...');
      
      try {
        const gogoanimeVideoSources = await scrapeGogoanimeVideoSources(episodeId);
        
        if (gogoanimeVideoSources.length === 0) {
          console.error('No GoGoAnime streaming sources found');
          return null;
        }
        
        return {
          sources: gogoanimeVideoSources.map((s) => ({
            url: s.url,
            quality: s.quality,
            isM3U8: s.type === 'm3u8',
          })),
          headers: gogoanimeVideoSources[0]?.headers || {
            Referer: 'https://anitaku.pe/',
          },
        };
      } catch (gogoanimeError) {
        console.error('Error fetching GoGoAnime sources:', gogoanimeError);
        return null;
      }
    }
    
    // Check if this is a Shafilm direct video URL
    if (episodeUrl && (episodeUrl.includes('shafilm.vip') || episodeUrl.includes('.mp4') || episodeUrl.includes('.mkv'))) {
      console.log('Detected Shafilm direct video URL');
      
      // Shafilm provides direct video file URLs
      return {
        sources: [{
          url: episodeUrl,
          quality: 'Direct',
          isM3U8: false,
        }],
        headers: {
          Referer: 'https://prime.shafilm.vip/',
        },
      };
    }
    
    // If we have the episode URL directly for AniWatch, use it
    if (episodeUrl) {
      const sources = await aniwatchRateLimiter.add(() => 
        getAniwatchStreamSources(episodeUrl)
      );
      
      if (sources.length === 0) {
        console.error('No streaming sources found');
        return null;
      }
      
      return {
        sources: sources.map((s: AniwatchStreamSource) => ({
          url: s.url,
          quality: s.quality,
          isM3U8: s.type === 'hls' || s.type === 'm3u8',
        })),
        headers: {
          Referer: 'https://aniwatchtv.to/',
          Origin: 'https://aniwatchtv.to',
        },
      };
    }
    
    // Otherwise, try to construct URL from episode ID
    // Format: anime-name-12345-episode-1
    const parts = episodeId.split('-episode-');
    if (parts.length === 2) {
      const animeId = parts[0];
      const epNumber = parts[1];
      const url = `https://aniwatchtv.to/watch/${animeId}?ep=${epNumber}`;
      
      const sources = await aniwatchRateLimiter.add(() => 
        getAniwatchStreamSources(url)
      );
      
      if (sources.length === 0) {
        console.error('No streaming sources found');
        return null;
      }
      
      return {
        sources: sources.map((s: AniwatchStreamSource) => ({
          url: s.url,
          quality: s.quality,
          isM3U8: s.type === 'hls' || s.type === 'm3u8',
        })),
        headers: {
          Referer: 'https://aniwatchtv.to/',
          Origin: 'https://aniwatchtv.to',
        },
      };
    }
    
    console.error('Could not determine episode URL');
    return null;
  } catch (error) {
    console.error('Error fetching streaming sources:', error);
    return null;
  }
};

/**
 * Get anime servers (not applicable for AniWatch)
 */
export const getAnimeServers = async (episodeId: string): Promise<any[]> => {
  console.log('Server selection not available for AniWatch');
  return [];
};

/**
 * Find anime by title for streaming
 */
export const findAnimeForStreaming = async (title: string): Promise<{
  id: string;
  source: string;
  folderName?: string;
} | null> => {
  try {
    const results = await searchAnimeForStreaming(title);
    if (results.length === 0) return null;
    
    const firstResult = results[0];
    return {
      id: firstResult.id,
      source: 'AniWatch',
    };
  } catch (error) {
    console.error('Error finding anime:', error);
    return null;
  }
};

/**
 * Get recommended quality source (prefer HLS/M3U8 or highest available)
 */
export const getRecommendedSource = (sources: StreamingSource[]): StreamingSource | null => {
  if (sources.length === 0) return null;
  
  // Prefer HLS streams
  const hlsSource = sources.find(s => s.isM3U8);
  if (hlsSource) return hlsSource;
  
  // Otherwise return first available
  return sources[0];
};

/**
 * Get home page data from AniWatch
 */
export const getHomeData = async (): Promise<{
  popular: any[];
  trending: any[];
  movies: any[];
}> => {
  try {
    const data = await aniwatchRateLimiter.add(() => getAniwatchHome());
    
    return {
      popular: data.popular.map((anime: AniwatchAnime) => ({
        id: anime.id,
        title: anime.title,
        image: anime.image,
        url: anime.url,
        type: anime.type,
        rating: anime.rating,
      })),
      trending: data.trending.map((anime: AniwatchAnime) => ({
        id: anime.id,
        title: anime.title,
        image: anime.image,
        url: anime.url,
        type: anime.type,
        rating: anime.rating,
      })),
      movies: [], // Can be added later
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return { popular: [], trending: [], movies: [] };
  }
};

/**
 * Check if source is available
 */
export const isAniwatchAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://aniwatchtv.to/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Export for backwards compatibility
export const areTorrentsEnabled = (): boolean => false;
export const getTorrentDisclaimer = (): string => 'Torrents are not available';
export const logTorrentDisclaimer = (): void => {};
