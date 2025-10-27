/**
 * New Streaming API Service - Using Official Aniwatch NPM Package
 *
 * This uses the official 'aniwatch' npm package for reliable scraping
 *
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 */

import {
  searchAniwatchApi,
  getAniwatchApiInfo,
  getAniwatchApiSources,
  getAniwatchApiTrending,
  AniwatchApiAnime,
  AniwatchApiInfo,
  AniwatchApiSource,
} from './aniwatchApiService';

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
  title: string;
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
 * Search for anime using official Aniwatch API (with GoGoAnime fallback)
 */
export const searchAnimeForStreaming = async (query: string): Promise<any[]> => {
  try {
    console.log('🔍 Searching Aniwatch API for:', query);

    // Use official Aniwatch API
    const results = await searchAniwatchApi(query);

    // Convert to standard format
    const formattedResults = results.map((anime: AniwatchApiAnime) => ({
      id: anime.id,
      title: anime.title,
      url: anime.url,
      image: anime.image,
      description: anime.description,
      source: 'AniWatch',
      type: anime.type,
      rating: anime.rating,
      releaseDate: anime.releaseDate,
    }));

    console.log(`✓ Found ${formattedResults.length} results from Aniwatch API`);

    // If no results from Aniwatch, try GoGoAnime as fallback
    if (formattedResults.length === 0) {
      console.log('No Aniwatch results, trying GoGoAnime fallback...');

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

        console.log(`✓ Found ${gogoanimeFormatted.length} results from GoGoAnime`);
        return gogoanimeFormatted;
      } catch (gogoanimeError) {
        console.error('GoGoAnime fallback failed:', gogoanimeError);
        return [];
      }
    }

    return formattedResults;
  } catch (error) {
    console.error('Error searching anime:', error);
    return [];
  }
};

/**
 * Get anime info and episodes using official Aniwatch API
 */
export const getAnimeStreamingInfo = async (animeId: string, source?: string): Promise<AnimeStreamingInfo | null> => {
  try {
    console.log('📺 Fetching anime info for:', animeId, 'Source:', source || 'Aniwatch');

    // Check if this is a GoGoAnime source
    if (source === 'GoGoAnime') {
      console.log('Using GoGoAnime source...');

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

    // Use official Aniwatch API
    const info = await getAniwatchApiInfo(animeId);

    if (!info) {
      return null;
    }

    return {
      id: info.id,
      title: info.title,
      image: info.image,
      description: info.description,
      genres: info.genres,
      releaseDate: info.releaseDate,
      status: info.status,
      totalEpisodes: info.totalEpisodes || info.episodes.length,
      episodes: info.episodes.map((ep) => ({
        id: ep.id,
        number: ep.number,
        title: ep.title,
        image: ep.image,
        description: undefined,
        url: ep.url,
      })),
    };
  } catch (error) {
    console.error('Error fetching anime info:', error);
    return null;
  }
};

/**
 * Get streaming sources for a specific episode using official Aniwatch API
 */
export const getStreamingSources = async (
  episodeId: string,
  episodeUrl?: string,
  source?: string
): Promise<StreamingData | null> => {
  try {
    console.log('🎬 Fetching streaming sources for:', episodeId);

    // GoGoAnime source
    if (source === 'GoGoAnime') {
      console.log('Using GoGoAnime source...');

      try {
        const sources = await scrapeGogoanimeVideoSources(episodeId);

        if (sources.length === 0) {
          console.error('No GoGoAnime sources found');
          return null;
        }

        return {
          sources: sources.map((s) => ({
            url: s.url,
            quality: s.quality,
            isM3U8: s.type === 'm3u8',
          })),
          headers: {
            Referer: 'https://gogoplay.io/',
          },
        };
      } catch (gogoanimeError) {
        console.error('GoGoAnime source error:', gogoanimeError);
        return null;
      }
    }

    // Use official Aniwatch API
    const sources = await getAniwatchApiSources(episodeId);

    if (sources.length === 0) {
      console.error('No streaming sources found from Aniwatch API');
      return null;
    }

    return {
      sources: sources.map((s: AniwatchApiSource) => ({
        url: s.url,
        quality: s.quality,
        isM3U8: s.isM3U8,
      })),
      headers: {
        Referer: 'https://aniwatch.to/',
      },
    };
  } catch (error) {
    console.error('Error fetching streaming sources:', error);
    return null;
  }
};

/**
 * Get home page data (trending, popular, etc.)
 */
export const getHomeData = async () => {
  try {
    console.log('🏠 Fetching home data from Aniwatch API...');

    const trending = await getAniwatchApiTrending(1);

    return {
      trending: trending.map((anime: AniwatchApiAnime) => ({
        id: anime.id,
        title: anime.title,
        image: anime.image,
        type: anime.type,
        rating: anime.rating,
      })),
      popular: [], // Can be added if needed
      recent: [], // Can be added if needed
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {
      trending: [],
      popular: [],
      recent: [],
    };
  }
};

/**
 * Helper: Convert any anime to standard format
 */
export const formatAnimeResult = (anime: any, source: string = 'AniWatch') => ({
  id: anime.id,
  title: anime.title || anime.name,
  image: anime.image || anime.poster,
  description: anime.description,
  source,
  type: anime.type,
  rating: anime.rating,
  url: anime.url,
});
