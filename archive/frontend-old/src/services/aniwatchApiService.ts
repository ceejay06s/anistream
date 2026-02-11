/**
 * Official Aniwatch API Service
 * Uses the official aniwatch npm package for reliable scraping
 */

import { HiAnime } from 'aniwatch';

const aniwatch = new HiAnime.Scraper();

export interface AniwatchApiAnime {
  id: string;
  title: string;
  image?: string;
  url?: string;
  type?: string;
  rating?: string;
  releaseDate?: string;
  description?: string;
}

export interface AniwatchApiEpisode {
  id: string;
  number: number;
  title: string;
  url?: string;
  image?: string;
}

export interface AniwatchApiInfo {
  id: string;
  title: string;
  image?: string;
  description?: string;
  genres?: string[];
  releaseDate?: string;
  status?: string;
  totalEpisodes: number;
  episodes: AniwatchApiEpisode[];
}

export interface AniwatchApiSource {
  url: string;
  quality: string;
  isM3U8: boolean;
  type?: string;
}

const normalizeAniwatchEpisode = (ep: any, fallbackNumber: number): AniwatchApiEpisode => ({
  id: ep?.episodeId || ep?.id || ep?.episode_id || `episode-${fallbackNumber}`,
  number: ep?.number || ep?.episode || fallbackNumber,
  title: ep?.title || ep?.name || `Episode ${ep?.number || ep?.episode || fallbackNumber}`,
  url: ep?.url,
  image: ep?.image,
});

const extractEpisodeList = (info: any): any[] => {
  if (Array.isArray(info?.episodes)) {
    return info.episodes;
  }

  if (Array.isArray(info?.anime?.episodes)) {
    return info.anime.episodes;
  }

  if (Array.isArray(info?.anime?.info?.episodes)) {
    return info.anime.info.episodes;
  }

  return [];
};

const normalizeServerEntry = (server: any, category?: string) => ({
  id: server?.id || server?.serverId || server?.server_id || server?.server || server?.name,
  name: server?.name || server?.serverName || server?.server || server?.id,
  category,
});

const extractServerList = (servers: any): Array<{ id?: string; name?: string; category?: string }> => {
  if (Array.isArray(servers)) {
    return servers.map((server) => normalizeServerEntry(server));
  }

  const results: Array<{ id?: string; name?: string; category?: string }> = [];
  if (servers && typeof servers === 'object') {
    if (Array.isArray(servers.sub)) {
      results.push(...servers.sub.map((server: any) => normalizeServerEntry(server, 'sub')));
    }
    if (Array.isArray(servers.dub)) {
      results.push(...servers.dub.map((server: any) => normalizeServerEntry(server, 'dub')));
    }
  }

  return results;
};

/**
 * Search anime using official Aniwatch API
 */
export const searchAniwatchApi = async (query: string): Promise<AniwatchApiAnime[]> => {
  try {
    console.log(`🔍 Searching Aniwatch API for: "${query}"`);

    const results = await aniwatch.search(query);

    if (!results || !results.animes) {
      console.log('No results found');
      return [];
    }

    const formatted = results.animes.map((anime: any) => ({
      id: anime.id,
      title: anime.name || anime.title,
      image: anime.poster || anime.image,
      url: `https://aniwatch.to/watch/${anime.id}`,
      type: anime.type,
      rating: anime.rating,
      releaseDate: anime.releaseDate,
      description: anime.description,
    }));

    console.log(`✓ Found ${formatted.length} results from Aniwatch API`);
    return formatted;
  } catch (error: any) {
    console.error('Aniwatch API search error:', error.message);
    return [];
  }
};

/**
 * Get anime info and episodes using official Aniwatch API
 * NOTE: Episodes are fetched separately using getEpisodes()
 */
export const getAniwatchApiInfo = async (animeId: string): Promise<AniwatchApiInfo | null> => {
  try {
    console.log(`📺 Fetching anime info from Aniwatch API: ${animeId}`);

    const info = await aniwatch.getInfo(animeId);

    if (!info || !info.anime) {
      console.error('No info found');
      return null;
    }

    const animeInfo = info.anime?.info || info.anime || info;
    const episodes: AniwatchApiEpisode[] = [];

    const infoEpisodes = extractEpisodeList(info);
    if (infoEpisodes.length > 0) {
      infoEpisodes.forEach((ep: any, index: number) => {
        episodes.push(normalizeAniwatchEpisode(ep, index + 1));
      });
    } else {
      // Fallback: fetch episodes separately when not provided by getInfo()
      try {
        console.log(`📋 Fetching episodes list for ${animeId}...`);
        const episodesData = await aniwatch.getEpisodes(animeId);

        const episodesList = Array.isArray(episodesData)
          ? episodesData
          : episodesData?.episodes || [];

        episodesList.forEach((ep: any, index: number) => {
          episodes.push(normalizeAniwatchEpisode(ep, index + 1));
        });
      } catch (epError: any) {
        console.error('Error fetching episodes:', epError.message);
      }
    }

    const genres = info.anime?.moreInfo?.genres || info.moreInfo?.genres;
    const aired = info.anime?.moreInfo?.aired || info.moreInfo?.aired;
    const status = info.anime?.moreInfo?.status || info.moreInfo?.status;

    const result: AniwatchApiInfo = {
      id: animeId,
      title: animeInfo?.name || animeInfo?.title || animeId,
      image: animeInfo?.poster || animeInfo?.image || undefined,
      description: animeInfo?.description || undefined,
      genres: Array.isArray(genres) ? genres : genres ? [genres] : [],
      releaseDate: Array.isArray(aired) ? aired[0] : aired,
      status: Array.isArray(status) ? status[0] : status,
      totalEpisodes: episodes.length || animeInfo.stats?.episodes?.sub || 0,
      episodes,
    };

    console.log(`✓ Retrieved: ${result.title} (${result.totalEpisodes} episodes)`);
    return result;
  } catch (error: any) {
    console.error('Aniwatch API info error:', error.message);
    return null;
  }
};

/**
 * Get episode streaming sources using official Aniwatch API
 * @param episodeId - Episode ID (e.g., "one-piece-100?ep=2142")
 * @param server - Server name (default: "hd-1")
 * @param category - "sub" or "dub" (default: "sub")
 */
export const getAniwatchApiSources = async (
  episodeId: string,
  server?: string,
  category: 'sub' | 'dub' = 'sub'
): Promise<AniwatchApiSource[]> => {
  try {
    let selectedServer = server;
    if (!selectedServer) {
      const availableServers = extractServerList(await aniwatch.getEpisodeServers(episodeId));
      const preferred = availableServers.find((entry) => entry.category === category) || availableServers[0];
      selectedServer = preferred?.id || preferred?.name || 'hd-1';
    }

    console.log(`🎬 Fetching sources from Aniwatch API: ${episodeId}`);
    console.log(`   Server: ${selectedServer}, Category: ${category}`);

    // Call with correct parameters: episodeId, server, category
    const data = await aniwatch.getEpisodeSources(episodeId, selectedServer, category);

    if (!data || !data.sources) {
      console.error('No sources found');
      return [];
    }

    const sources: AniwatchApiSource[] = [];

    // Process sources
    if (Array.isArray(data.sources)) {
      data.sources.forEach((source: any) => {
        sources.push({
          url: source.url || source.file,
          quality: source.quality || source.label || 'default',
          isM3U8: source.url?.includes('.m3u8') || source.type === 'hls' || false,
          type: source.type,
        });
      });
    }

    console.log(`✓ Found ${sources.length} sources from ${selectedServer}`);
    return sources;
  } catch (error: any) {
    console.error(`Aniwatch API sources error (${server || 'auto'}):`, error.message);
    return [];
  }
};

/**
 * Get episode servers (alternative sources)
 */
export const getAniwatchApiServers = async (episodeId: string): Promise<any[]> => {
  try {
    console.log(`🔌 Fetching servers from Aniwatch API: ${episodeId}`);

    const servers = await aniwatch.getEpisodeServers(episodeId);

    const normalized = extractServerList(servers);

    if (normalized.length === 0) {
      return [];
    }

    console.log(`✓ Found ${normalized.length} servers`);
    return normalized;
  } catch (error: any) {
    console.error('Aniwatch API servers error:', error.message);
    return [];
  }
};

/**
 * Get trending/popular anime from home page
 */
export const getAniwatchApiTrending = async (page: number = 1): Promise<AniwatchApiAnime[]> => {
  try {
    console.log(`📊 Fetching trending anime (page ${page})`);

    const data = await aniwatch.getHomePage();

    if (!data || !data.animes) {
      return [];
    }

    const formatted = data.animes.map((anime: any) => ({
      id: anime.id,
      title: anime.name || anime.title,
      image: anime.poster || anime.image,
      url: `https://aniwatch.to/watch/${anime.id}`,
      type: anime.type,
      rating: anime.rating,
    }));

    console.log(`✓ Found ${formatted.length} trending anime`);
    return formatted;
  } catch (error: any) {
    console.error('Aniwatch API trending error:', error.message);
    return [];
  }
};

/**
 * Get recent episodes from home page
 */
export const getAniwatchApiRecent = async (page: number = 1): Promise<any[]> => {
  try {
    console.log(`📅 Fetching recent episodes (page ${page})`);

    const data = await aniwatch.getHomePage();

    if (!data || !data.episodes) {
      return [];
    }

    console.log(`✓ Found ${data.episodes.length} recent episodes`);
    return data.episodes;
  } catch (error: any) {
    console.error('Aniwatch API recent error:', error.message);
    return [];
  }
};

/**
 * Complete workflow helper
 */
export const quickAniwatchApi = async (
  searchQuery: string,
  episodeNumber: number = 1
): Promise<{
  anime: AniwatchApiInfo | null;
  sources: AniwatchApiSource[];
}> => {
  console.log(`\n⚡ Quick Aniwatch API: ${searchQuery} Episode ${episodeNumber}\n`);

  try {
    // Step 1: Search
    const results = await searchAniwatchApi(searchQuery);

    if (results.length === 0) {
      console.log('✗ No search results');
      return { anime: null, sources: [] };
    }

    // Step 2: Get anime info
    const anime = await getAniwatchApiInfo(results[0].id);

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
    const sources = await getAniwatchApiSources(episode.id);

    console.log(`✓ Ready to play: ${anime.title} Episode ${episodeNumber}\n`);
    return { anime, sources };
  } catch (error: any) {
    console.error('Quick Aniwatch API error:', error.message);
    return { anime: null, sources: [] };
  }
};

/**
 * Export all functions
 */
export default {
  search: searchAniwatchApi,
  getInfo: getAniwatchApiInfo,
  getSources: getAniwatchApiSources,
  getServers: getAniwatchApiServers,
  getTrending: getAniwatchApiTrending,
  getRecent: getAniwatchApiRecent,
  quickPlay: quickAniwatchApi,
};
