/**
 * Consumet API Integration
 * Multiple anime providers in one service
 */

import { ANIME } from '@consumet/extensions';

export interface AnimeSearchResult {
  id: string;
  title: string;
  image?: string;
  url?: string;
  subOrDub?: 'sub' | 'dub';
  releaseDate?: string;
}

export interface AnimeEpisode {
  id: string;
  number: number;
  title?: string;
  url?: string;
  image?: string;
}

export interface AnimeInfo {
  id: string;
  title: string;
  image?: string;
  description?: string;
  genres?: string[];
  releaseDate?: string;
  status?: string;
  subOrDub?: 'sub' | 'dub';
  totalEpisodes?: number;
  episodes: AnimeEpisode[];
}

export interface StreamingSource {
  url: string;
  quality?: string;
  isM3U8: boolean;
  isDASH?: boolean;
}

export interface EpisodeSources {
  sources: StreamingSource[];
  subtitles?: Array<{
    url: string;
    lang: string;
  }>;
  intro?: {
    start: number;
    end: number;
  };
  outro?: {
    start: number;
    end: number;
  };
}

/**
 * Available Anime Providers
 */
export enum AnimeProvider {
  GOGOANIME = 'gogoanime',
  ZORO = 'zoro',
  ANIMEPAHE = 'animepahe',
  NINEANIME = '9anime',
  ANIMEFOX = 'animefox',
}

/**
 * Consumet Service - Unified anime API
 */
class ConsumetService {
  private providers: Map<AnimeProvider, any>;

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * Initialize all available providers
   */
  private initializeProviders() {
    try {
      // GoGoAnime
      this.providers.set(AnimeProvider.GOGOANIME, new ANIME.Gogoanime());
      console.log('✓ GoGoAnime provider initialized');

      // Zoro (formerly AniWatch)
      this.providers.set(AnimeProvider.ZORO, new ANIME.Zoro());
      console.log('✓ Zoro provider initialized');

      // AnimePahe
      this.providers.set(AnimeProvider.ANIMEPAHE, new ANIME.AnimePahe());
      console.log('✓ AnimePahe provider initialized');

      // 9anime
      this.providers.set(AnimeProvider.NINEANIME, new ANIME.NineAnime());
      console.log('✓ 9anime provider initialized');

      // AnimeFox
      this.providers.set(AnimeProvider.ANIMEFOX, new ANIME.AnimeFox());
      console.log('✓ AnimeFox provider initialized');

    } catch (error) {
      console.error('Error initializing providers:', error);
    }
  }

  /**
   * Search anime across a specific provider
   */
  async search(
    query: string,
    provider: AnimeProvider = AnimeProvider.GOGOANIME
  ): Promise<AnimeSearchResult[]> {
    try {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        throw new Error(`Provider ${provider} not available`);
      }

      console.log(`Searching ${provider} for: ${query}`);
      const results = await providerInstance.search(query);

      return results.results.map((anime: any) => ({
        id: anime.id,
        title: anime.title,
        image: anime.image,
        url: anime.url,
        subOrDub: anime.subOrDub,
        releaseDate: anime.releaseDate,
      }));
    } catch (error) {
      console.error(`Error searching ${provider}:`, error);
      return [];
    }
  }

  /**
   * Search across multiple providers simultaneously
   */
  async searchMultiple(query: string, providers?: AnimeProvider[]): Promise<{
    provider: AnimeProvider;
    results: AnimeSearchResult[];
  }[]> {
    const providersToSearch = providers || [
      AnimeProvider.GOGOANIME,
      AnimeProvider.ZORO,
      AnimeProvider.ANIMEPAHE,
    ];

    const searchPromises = providersToSearch.map(async (provider) => ({
      provider,
      results: await this.search(query, provider),
    }));

    return Promise.all(searchPromises);
  }

  /**
   * Get anime information and episodes
   */
  async getAnimeInfo(
    animeId: string,
    provider: AnimeProvider = AnimeProvider.GOGOANIME
  ): Promise<AnimeInfo | null> {
    try {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        throw new Error(`Provider ${provider} not available`);
      }

      console.log(`Fetching anime info from ${provider}: ${animeId}`);
      const info = await providerInstance.fetchAnimeInfo(animeId);

      return {
        id: info.id,
        title: info.title,
        image: info.image,
        description: info.description,
        genres: info.genres,
        releaseDate: info.releaseDate,
        status: info.status,
        subOrDub: info.subOrDub,
        totalEpisodes: info.totalEpisodes,
        episodes: info.episodes.map((ep: any) => ({
          id: ep.id,
          number: ep.number,
          title: ep.title,
          url: ep.url,
          image: ep.image,
        })),
      };
    } catch (error) {
      console.error(`Error fetching anime info from ${provider}:`, error);
      return null;
    }
  }

  /**
   * Get episode streaming sources
   */
  async getEpisodeSources(
    episodeId: string,
    provider: AnimeProvider = AnimeProvider.GOGOANIME
  ): Promise<EpisodeSources | null> {
    try {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        throw new Error(`Provider ${provider} not available`);
      }

      console.log(`Fetching episode sources from ${provider}: ${episodeId}`);
      const sources = await providerInstance.fetchEpisodeSources(episodeId);

      return {
        sources: sources.sources.map((source: any) => ({
          url: source.url,
          quality: source.quality,
          isM3U8: source.isM3U8,
          isDASH: source.isDASH,
        })),
        subtitles: sources.subtitles,
        intro: sources.intro,
        outro: sources.outro,
      };
    } catch (error) {
      console.error(`Error fetching episode sources from ${provider}:`, error);
      return null;
    }
  }

  /**
   * Get episode servers (useful for backup sources)
   */
  async getEpisodeServers(
    episodeId: string,
    provider: AnimeProvider = AnimeProvider.GOGOANIME
  ): Promise<any[]> {
    try {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        throw new Error(`Provider ${provider} not available`);
      }

      console.log(`Fetching episode servers from ${provider}: ${episodeId}`);
      const servers = await providerInstance.fetchEpisodeServers(episodeId);
      return servers;
    } catch (error) {
      console.error(`Error fetching episode servers from ${provider}:`, error);
      return [];
    }
  }

  /**
   * Get sources with fallback across providers
   */
  async getSourcesWithFallback(
    episodeId: string,
    animeTitle?: string
  ): Promise<{
    provider: AnimeProvider;
    sources: EpisodeSources;
  } | null> {
    const providers = [
      AnimeProvider.GOGOANIME,
      AnimeProvider.ZORO,
      AnimeProvider.ANIMEPAHE,
    ];

    for (const provider of providers) {
      try {
        const sources = await this.getEpisodeSources(episodeId, provider);
        if (sources && sources.sources.length > 0) {
          console.log(`✓ Found sources from ${provider}`);
          return { provider, sources };
        }
      } catch (error) {
        console.log(`✗ ${provider} failed, trying next...`);
      }
    }

    return null;
  }

  /**
   * Get recent anime episodes
   */
  async getRecentEpisodes(
    provider: AnimeProvider = AnimeProvider.GOGOANIME,
    page: number = 1
  ): Promise<any[]> {
    try {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        throw new Error(`Provider ${provider} not available`);
      }

      console.log(`Fetching recent episodes from ${provider}, page ${page}`);
      const recent = await providerInstance.fetchRecentEpisodes(page);
      return recent.results || [];
    } catch (error) {
      console.error(`Error fetching recent episodes from ${provider}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const consumetService = new ConsumetService();

/**
 * Convenience functions
 */

export const searchAnime = (query: string, provider?: AnimeProvider) =>
  consumetService.search(query, provider);

export const searchAllProviders = (query: string) =>
  consumetService.searchMultiple(query);

export const getAnimeInfo = (animeId: string, provider?: AnimeProvider) =>
  consumetService.getAnimeInfo(animeId, provider);

export const getEpisodeSources = (episodeId: string, provider?: AnimeProvider) =>
  consumetService.getEpisodeSources(episodeId, provider);

export const getSourcesWithFallback = (episodeId: string, animeTitle?: string) =>
  consumetService.getSourcesWithFallback(episodeId, animeTitle);
