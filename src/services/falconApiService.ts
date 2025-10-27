/**
 * Falcon Anime API Service
 * 
 * Integration with https://github.com/falcon71181/Anime-API
 * Deployed at: https://api-anime-rouge.vercel.app
 * 
 * Features:
 * - GoGoAnime scraping
 * - Aniwatch support
 * - Built-in caching
 * - Multiple endpoints
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 */

const FALCON_API_BASE = 'https://api-anime-rouge.vercel.app';

export interface FalconAnime {
  id: string;
  name: string;
  img: string;
  releasedYear?: string;
  animeUrl?: string;
  genres?: string[];
  latestEp?: string;
  subOrDub?: 'SUB' | 'DUB';
}

export interface FalconEpisode {
  id: string;
  number: number;
  title?: string;
  episodeId: string;
  episodeUrl: string;
  subOrDub?: 'SUB' | 'DUB';
}

export interface FalconAnimeInfo {
  id: string;
  anime_id: string;
  info: {
    name: string;
    img: string;
    type: string;
    genre: string[];
    status: string;
    aired_in: number;
    other_name: string;
    episodes: number;
  };
}

export interface FalconStreamSource {
  url: string;
  quality: string;
  type: string;
}

/**
 * Get GoGoAnime home page data
 */
export const getFalconHome = async (): Promise<{
  genres: string[];
  recentReleases: FalconAnime[];
  recentlyAddedSeries: FalconAnime[];
  onGoingSeries: FalconAnime[];
} | null> => {
  try {
    console.log('Fetching Falcon API home data...');
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/home`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Falcon home:', error);
    return null;
  }
};

/**
 * Get recent releases from GoGoAnime
 */
export const getFalconRecentReleases = async (page: number = 1): Promise<FalconAnime[]> => {
  try {
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/recent-releases?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching recent releases:', error);
    return [];
  }
};

/**
 * Get top airing anime
 */
export const getFalconTopAiring = async (page: number = 1): Promise<FalconAnime[]> => {
  try {
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/top-airing?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching top airing:', error);
    return [];
  }
};

/**
 * Get popular anime
 */
export const getFalconPopular = async (page: number = 1): Promise<FalconAnime[]> => {
  try {
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/popular?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching popular anime:', error);
    return [];
  }
};

/**
 * Search anime on Falcon API
 */
export const searchFalconAnime = async (
  query: string, 
  page: number = 1
): Promise<FalconAnime[]> => {
  try {
    console.log('Searching Falcon API for:', query);
    
    // Convert query to kebab-case format
    const kebabQuery = query.toLowerCase().replace(/\s+/g, '+');
    
    const response = await fetch(
      `${FALCON_API_BASE}/gogoanime/search?keyword=${kebabQuery}&page=${page}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.animes || [];
  } catch (error) {
    console.error('Error searching Falcon API:', error);
    return [];
  }
};

/**
 * Get anime details/info
 */
export const getFalconAnimeInfo = async (animeId: string): Promise<FalconAnimeInfo | null> => {
  try {
    console.log('Fetching Falcon anime info for:', animeId);
    
    // Convert to kebab-case if needed
    const kebabId = animeId.toLowerCase().replace(/\s+/g, '-');
    
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/anime/${kebabId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Falcon anime info:', error);
    return null;
  }
};

/**
 * Get anime episodes
 */
export const getFalconEpisodes = async (animeId: string): Promise<FalconEpisode[]> => {
  try {
    console.log('Fetching Falcon episodes for:', animeId);
    
    const kebabId = animeId.toLowerCase().replace(/\s+/g, '-');
    
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/episodes/${kebabId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Convert to standard format
    if (Array.isArray(data)) {
      return data.map((ep: any, index: number) => ({
        id: ep.episodeId || ep.id,
        number: ep.episodeNo || index + 1,
        title: ep.name || `Episode ${ep.episodeNo || index + 1}`,
        episodeId: ep.episodeId,
        episodeUrl: ep.episodeUrl,
        subOrDub: ep.subOrDub,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching Falcon episodes:', error);
    return [];
  }
};

/**
 * Get episode servers
 */
export const getFalconServers = async (episodeId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/servers?id=${episodeId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching servers:', error);
    return [];
  }
};

/**
 * Get streaming sources for episode
 */
export const getFalconStreamSources = async (
  episodeId: string,
  server: string = 'vidstreaming',
  category: string = 'sub'
): Promise<FalconStreamSource[]> => {
  try {
    console.log('Fetching Falcon stream sources:', episodeId);
    
    const response = await fetch(
      `${FALCON_API_BASE}/gogoanime/episode-srcs?id=${episodeId}&server=${server}&category=${category}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse response
    if (data && data.sources) {
      return data.sources.map((source: any) => ({
        url: source.url || source.file,
        quality: source.quality || source.label || 'auto',
        type: source.type || 'hls',
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching Falcon stream sources:', error);
    return [];
  }
};

/**
 * Get anime movies
 */
export const getFalconAnimeMovies = async (page: number = 1): Promise<FalconAnime[]> => {
  try {
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/anime-movies?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching anime movies:', error);
    return [];
  }
};

/**
 * Get completed anime
 */
export const getFalconCompleted = async (page: number = 1): Promise<FalconAnime[]> => {
  try {
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/completed?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching completed anime:', error);
    return [];
  }
};

/**
 * Get new seasons
 */
export const getFalconNewSeasons = async (page: number = 1): Promise<FalconAnime[]> => {
  try {
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/new-seasons?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching new seasons:', error);
    return [];
  }
};

/**
 * Format anime ID to kebab-case
 */
export const formatAnimeId = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Remove multiple hyphens
    .trim();
};

/**
 * Get best stream source from available sources
 */
export const getBestFalconSource = (sources: FalconStreamSource[]): FalconStreamSource | null => {
  if (sources.length === 0) return null;
  
  // Priority: 1080p > 720p > default > auto
  const qualityPriority = ['1080p', '720p', 'default', 'auto'];
  
  for (const quality of qualityPriority) {
    const source = sources.find(s => 
      s.quality.toLowerCase() === quality.toLowerCase()
    );
    if (source) return source;
  }
  
  return sources[0];
};

/**
 * Check if Falcon API is available
 */
export const checkFalconApiStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${FALCON_API_BASE}/gogoanime/home`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get trending anime (combination of top airing and popular)
 */
export const getFalconTrending = async (): Promise<FalconAnime[]> => {
  try {
    const [topAiring, popular] = await Promise.all([
      getFalconTopAiring(1),
      getFalconPopular(1)
    ]);
    
    // Combine and deduplicate
    const combined = [...topAiring, ...popular];
    const unique = combined.filter((anime, index, self) =>
      index === self.findIndex((a) => a.id === anime.id)
    );
    
    return unique.slice(0, 20); // Return top 20
  } catch (error) {
    console.error('Error fetching trending:', error);
    return [];
  }
};

/**
 * Cache manager for Falcon API responses
 */
class FalconApiCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private defaultTTL = 3600 * 1000; // 1 hour in milliseconds
  
  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl || this.defaultTTL),
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const falconApiCache = new FalconApiCache();

/**
 * Cached search with local caching
 */
export const searchFalconAnimeCached = async (
  query: string,
  page: number = 1
): Promise<FalconAnime[]> => {
  const cacheKey = `search:${query}:${page}`;
  const cached = falconApiCache.get(cacheKey);
  
  if (cached) {
    console.log('Using cached Falcon search results');
    return cached;
  }
  
  const results = await searchFalconAnime(query, page);
  falconApiCache.set(cacheKey, results);
  
  return results;
};

