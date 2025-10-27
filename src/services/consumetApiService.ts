/**
 * Consumet API Service (HTTP API Version)
 * Uses the public Consumet API instead of the npm package
 * Works better with React Native/Expo
 */

import axios from 'axios';

// Public Consumet API endpoint
const CONSUMET_API = 'https://api.consumet.org';

export enum ConsumetProvider {
  GOGOANIME = 'gogoanime',
  ZORO = 'zoro',
  ANIMEPAHE = 'animepahe',
  NINEANIME = '9anime',
}

export interface ConsumetSearchResult {
  id: string;
  title: string;
  url?: string;
  image?: string;
  releaseDate?: string;
  subOrDub?: string;
}

export interface ConsumetEpisode {
  id: string;
  number: number;
  title?: string;
  url?: string;
  image?: string;
}

export interface ConsumetAnimeInfo {
  id: string;
  title: string;
  url?: string;
  image?: string;
  description?: string;
  genres?: string[];
  releaseDate?: string;
  status?: string;
  totalEpisodes?: number;
  subOrDub?: string;
  episodes: ConsumetEpisode[];
}

export interface ConsumetSource {
  url: string;
  quality?: string;
  isM3U8: boolean;
}

/**
 * Search anime using Consumet API
 */
export const searchConsumetAnime = async (
  query: string,
  provider: ConsumetProvider = ConsumetProvider.GOGOANIME
): Promise<ConsumetSearchResult[]> => {
  try {
    console.log(`🔍 Searching Consumet ${provider} for: "${query}"`);

    const response = await axios.get(`${CONSUMET_API}/anime/${provider}/${encodeURIComponent(query)}`, {
      timeout: 15000,
    });

    if (!response.data || !response.data.results) {
      console.log('No results found');
      return [];
    }

    const results = response.data.results.map((anime: any) => ({
      id: anime.id,
      title: anime.title,
      url: anime.url,
      image: anime.image,
      releaseDate: anime.releaseDate,
      subOrDub: anime.subOrDub,
    }));

    console.log(`✅ Found ${results.length} results from Consumet ${provider}`);
    return results;
  } catch (error: any) {
    console.error(`Consumet ${provider} search error:`, error.message);
    return [];
  }
};

/**
 * Get anime info and episodes
 */
export const getConsumetAnimeInfo = async (
  animeId: string,
  provider: ConsumetProvider = ConsumetProvider.GOGOANIME
): Promise<ConsumetAnimeInfo | null> => {
  try {
    console.log(`📺 Fetching anime info from Consumet ${provider}: ${animeId}`);

    const response = await axios.get(`${CONSUMET_API}/anime/${provider}/info/${animeId}`, {
      timeout: 15000,
    });

    if (!response.data) {
      console.error('No info found');
      return null;
    }

    const data = response.data;
    const episodes: ConsumetEpisode[] = [];

    if (data.episodes && Array.isArray(data.episodes)) {
      data.episodes.forEach((ep: any) => {
        episodes.push({
          id: ep.id,
          number: ep.number,
          title: ep.title,
          url: ep.url,
          image: ep.image,
        });
      });
    }

    const result: ConsumetAnimeInfo = {
      id: data.id,
      title: data.title,
      url: data.url,
      image: data.image,
      description: data.description,
      genres: data.genres,
      releaseDate: data.releaseDate,
      status: data.status,
      totalEpisodes: data.totalEpisodes || episodes.length,
      subOrDub: data.subOrDub,
      episodes,
    };

    console.log(`✅ Retrieved: ${result.title} (${result.totalEpisodes} episodes)`);
    return result;
  } catch (error: any) {
    console.error(`Consumet ${provider} info error:`, error.message);
    return null;
  }
};

/**
 * Get episode streaming sources
 */
export const getConsumetEpisodeSources = async (
  episodeId: string,
  provider: ConsumetProvider = ConsumetProvider.GOGOANIME
): Promise<{ sources: ConsumetSource[]; subtitles?: any[] } | null> => {
  try {
    console.log(`🎬 Fetching sources from Consumet ${provider}: ${episodeId}`);

    const response = await axios.get(`${CONSUMET_API}/anime/${provider}/watch/${episodeId}`, {
      timeout: 15000,
    });

    if (!response.data || !response.data.sources) {
      console.error('No sources found');
      return null;
    }

    const sources: ConsumetSource[] = response.data.sources.map((source: any) => ({
      url: source.url,
      quality: source.quality || 'default',
      isM3U8: source.isM3U8 || source.url?.includes('.m3u8') || false,
    }));

    console.log(`✅ Found ${sources.length} sources`);
    return {
      sources,
      subtitles: response.data.subtitles || [],
    };
  } catch (error: any) {
    console.error(`Consumet ${provider} sources error:`, error.message);
    return null;
  }
};

/**
 * Search across multiple providers
 */
export const searchMultipleProviders = async (
  query: string
): Promise<{
  gogoanime: ConsumetSearchResult[];
  zoro: ConsumetSearchResult[];
}> => {
  const [gogoResults, zoroResults] = await Promise.allSettled([
    searchConsumetAnime(query, ConsumetProvider.GOGOANIME),
    searchConsumetAnime(query, ConsumetProvider.ZORO),
  ]);

  return {
    gogoanime: gogoResults.status === 'fulfilled' ? gogoResults.value : [],
    zoro: zoroResults.status === 'fulfilled' ? zoroResults.value : [],
  };
};

/**
 * Get sources with fallback across providers
 */
export const getSourcesWithFallback = async (
  episodeId: string
): Promise<{ sources: ConsumetSource[]; provider: string } | null> => {
  const providers = [ConsumetProvider.GOGOANIME, ConsumetProvider.ZORO];

  for (const provider of providers) {
    try {
      const data = await getConsumetEpisodeSources(episodeId, provider);
      if (data && data.sources.length > 0) {
        console.log(`✓ Found sources from ${provider}`);
        return { sources: data.sources, provider };
      }
    } catch (error) {
      console.log(`✗ ${provider} failed, trying next...`);
    }
  }

  return null;
};

/**
 * Complete workflow helper
 */
export const quickConsumetPlay = async (
  searchQuery: string,
  episodeNumber: number = 1,
  provider: ConsumetProvider = ConsumetProvider.GOGOANIME
): Promise<{
  anime: ConsumetAnimeInfo | null;
  sources: ConsumetSource[];
}> => {
  console.log(`\n⚡ Quick Consumet: ${searchQuery} Episode ${episodeNumber}\n`);

  try {
    // Step 1: Search
    const results = await searchConsumetAnime(searchQuery, provider);

    if (results.length === 0) {
      console.log('✗ No search results');
      return { anime: null, sources: [] };
    }

    // Step 2: Get anime info
    const anime = await getConsumetAnimeInfo(results[0].id, provider);

    if (!anime) {
      console.log('✗ Could not get anime info');
      return { anime: null, sources: [] };
    }

    // Step 3: Find episode
    const episode = anime.episodes.find(ep => ep.number === episodeNumber);

    if (!episode) {
      console.log(`✗ Episode ${episodeNumber} not found`);
      return { anime, sources: [] };
    }

    // Step 4: Get sources
    const sourcesData = await getConsumetEpisodeSources(episode.id, provider);

    if (!sourcesData) {
      console.log('✗ No sources found');
      return { anime, sources: [] };
    }

    console.log(`✓ Ready to play: ${anime.title} Episode ${episodeNumber}\n`);
    return { anime, sources: sourcesData.sources };
  } catch (error: any) {
    console.error('Quick Consumet error:', error.message);
    return { anime: null, sources: [] };
  }
};

/**
 * Export default object
 */
export default {
  search: searchConsumetAnime,
  getInfo: getConsumetAnimeInfo,
  getSources: getConsumetEpisodeSources,
  searchMultiple: searchMultipleProviders,
  getSourcesWithFallback,
  quickPlay: quickConsumetPlay,
};
