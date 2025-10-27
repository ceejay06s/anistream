/**
 * Anime Heaven Service
 * Uses the anime-heaven npm package for reliable anime scraping
 */

import { animesearch, animeinfo, animedl } from 'anime-heaven';

export interface AnimeHeavenResult {
  id: string;
  title: string;
  image?: string;
  url?: string;
  episodes?: number;
}

export interface AnimeHeavenInfo {
  id: string;
  title: string;
  image?: string;
  description?: string;
  genres?: string[];
  episodes: Array<{
    id: string;
    number: number;
    title: string;
    url?: string;
  }>;
  totalEpisodes: number;
}

export interface AnimeHeavenSource {
  url: string;
  quality: string;
  type: string;
}

/**
 * Search anime
 */
export const searchAnimeHeaven = async (query: string): Promise<AnimeHeavenResult[]> => {
  try {
    console.log(`🔍 Searching Anime Heaven for: "${query}"`);

    const results = await animesearch(query);

    if (!results || results.length === 0) {
      console.log('No results found');
      return [];
    }

    const formatted = results.map((anime: any) => ({
      id: anime.url || anime.id, // Use URL as ID
      title: anime.title,
      image: anime.image,
      url: anime.url,
      episodes: anime.episodes,
    }));

    console.log(`✓ Found ${formatted.length} results from Anime Heaven`);
    return formatted;
  } catch (error: any) {
    console.error('Anime Heaven search error:', error.message);
    return [];
  }
};

/**
 * Get anime info and episodes
 */
export const getAnimeHeavenInfo = async (animeId: string): Promise<AnimeHeavenInfo | null> => {
  try {
    console.log(`📺 Fetching anime info from Anime Heaven: ${animeId}`);

    const info = await animeinfo(animeId);

    if (!info) {
      console.error('No info found');
      return null;
    }

    const episodes: any[] = [];

    // Process episodes
    if (info.episodes && Array.isArray(info.episodes)) {
      info.episodes.forEach((ep: any, index: number) => {
        episodes.push({
          id: ep.id || ep.url || `ep-${index + 1}`,
          number: ep.number || ep.episode || index + 1,
          title: ep.title || `Episode ${ep.number || index + 1}`,
          url: ep.url,
        });
      });
    }

    const result = {
      id: animeId,
      title: info.title || info.name || animeId,
      image: info.image || info.poster,
      description: info.description || info.synopsis,
      genres: info.genres || [],
      episodes,
      totalEpisodes: episodes.length || info.totalEpisodes || 0,
    };

    console.log(`✓ Retrieved: ${result.title} (${result.totalEpisodes} episodes)`);
    return result;
  } catch (error: any) {
    console.error('Anime Heaven info error:', error.message);
    return null;
  }
};

/**
 * Get episode streaming sources
 */
export const getAnimeHeavenSources = async (episodeId: string): Promise<AnimeHeavenSource[]> => {
  try {
    console.log(`🎬 Fetching sources from Anime Heaven: ${episodeId}`);

    const data = await animedl(episodeId);

    if (!data || (!data.sources && !data.streamingLinks)) {
      console.error('No sources found');
      return [];
    }

    const sources: AnimeHeavenSource[] = [];

    // Process sources (handle different response formats)
    const sourceArray = data.sources || data.streamingLinks || [];

    if (Array.isArray(sourceArray)) {
      sourceArray.forEach((source: any) => {
        sources.push({
          url: source.url || source.file || source.link,
          quality: source.quality || source.label || 'default',
          type: source.type || (source.url?.includes('.m3u8') ? 'm3u8' : 'mp4'),
        });
      });
    }

    console.log(`✓ Found ${sources.length} sources`);
    return sources;
  } catch (error: any) {
    console.error('Anime Heaven sources error:', error.message);
    return [];
  }
};

/**
 * Get popular anime
 */
export const getAnimeHeavenPopular = async (page: number = 1): Promise<AnimeHeavenResult[]> => {
  // anime-heaven package doesn't have a getPopular function
  console.log('📊 Popular anime not available in anime-heaven package');
  return [];
};

/**
 * Complete workflow helper
 */
export const quickAnimeHeaven = async (
  searchQuery: string,
  episodeNumber: number = 1
): Promise<{
  anime: AnimeHeavenInfo | null;
  sources: AnimeHeavenSource[];
}> => {
  console.log(`\n⚡ Quick Anime Heaven: ${searchQuery} Episode ${episodeNumber}\n`);

  try {
    // Step 1: Search
    const results = await searchAnimeHeaven(searchQuery);

    if (results.length === 0) {
      console.log('✗ No search results');
      return { anime: null, sources: [] };
    }

    // Step 2: Get anime info
    const anime = await getAnimeHeavenInfo(results[0].id);

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
    const sources = await getAnimeHeavenSources(episode.id);

    console.log(`✓ Ready to play: ${anime.title} Episode ${episodeNumber}\n`);
    return { anime, sources };
  } catch (error: any) {
    console.error('Quick Anime Heaven error:', error.message);
    return { anime: null, sources: [] };
  }
};

/**
 * Export default
 */
export default {
  search: searchAnimeHeaven,
  getInfo: getAnimeHeavenInfo,
  getSources: getAnimeHeavenSources,
  getPopular: getAnimeHeavenPopular,
  quickPlay: quickAnimeHeaven,
};
