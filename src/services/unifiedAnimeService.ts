/**
 * Unified Anime Service
 * Combines all scraping methods with intelligent fallback
 */

import { consumetService, AnimeProvider } from './consumetService';
import { improvedGogoScraper } from './improvedGogoanimeScraper';
import { multiSourceManager } from './multiSourceScraper';
import { videoExtractor } from './videoExtractor';

export interface UnifiedSearchResult {
  id: string;
  title: string;
  image?: string;
  source: string;
  url?: string;
}

export interface UnifiedAnimeInfo {
  id: string;
  title: string;
  image?: string;
  description?: string;
  genres?: string[];
  episodes: Array<{
    id: string;
    number: number;
    title: string;
  }>;
  totalEpisodes: number;
  source: string;
}

export interface UnifiedVideoSource {
  url: string;
  quality: string;
  type: 'mp4' | 'm3u8';
  headers?: Record<string, string>;
  subtitles?: Array<{
    url: string;
    lang: string;
  }>;
}

/**
 * Unified Anime Service with intelligent fallback
 */
export class UnifiedAnimeService {
  /**
   * Search across all available sources
   */
  async search(query: string): Promise<{
    consumet: UnifiedSearchResult[];
    gogoanime: UnifiedSearchResult[];
    multiSource: UnifiedSearchResult[];
  }> {
    console.log(`\n🔍 Searching all sources for: "${query}"\n`);

    // Search in parallel
    const [consumetResults, gogoResults, multiResults] = await Promise.allSettled([
      // Consumet (multiple providers)
      consumetService.searchMultiple(query, [
        AnimeProvider.GOGOANIME,
        AnimeProvider.ZORO,
        AnimeProvider.ANIMEPAHE,
      ]),
      // Improved GoGoAnime scraper
      improvedGogoScraper.search(query),
      // Multi-source scrapers
      multiSourceManager.searchAll(query),
    ]);

    // Process Consumet results
    const consumet: UnifiedSearchResult[] = [];
    if (consumetResults.status === 'fulfilled') {
      consumetResults.value.forEach(({ provider, results }) => {
        results.forEach(anime => {
          consumet.push({
            id: anime.id,
            title: anime.title,
            image: anime.image,
            source: `consumet-${provider}`,
            url: anime.url,
          });
        });
      });
    }

    // Process GoGoAnime results
    const gogoanime: UnifiedSearchResult[] = [];
    if (gogoResults.status === 'fulfilled') {
      gogoResults.value.forEach(anime => {
        gogoanime.push({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          source: 'gogoanime-improved',
          url: anime.url,
        });
      });
    }

    // Process multi-source results
    const multiSource: UnifiedSearchResult[] = [];
    if (multiResults.status === 'fulfilled') {
      const { zoro, animePahe, nineAnime } = multiResults.value;

      zoro.forEach(anime => {
        multiSource.push({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          source: 'zoro-scraper',
          url: anime.url,
        });
      });

      animePahe.forEach(anime => {
        multiSource.push({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          source: 'animepahe-scraper',
        });
      });

      nineAnime.forEach(anime => {
        multiSource.push({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          source: '9anime-scraper',
          url: anime.url,
        });
      });
    }

    console.log(`✓ Found ${consumet.length} from Consumet`);
    console.log(`✓ Found ${gogoanime.length} from GoGoAnime`);
    console.log(`✓ Found ${multiSource.length} from Multi-Source\n`);

    return { consumet, gogoanime, multiSource };
  }

  /**
   * Get anime info with fallback
   */
  async getAnimeInfo(
    animeId: string,
    source: string = 'auto'
  ): Promise<UnifiedAnimeInfo | null> {
    console.log(`\n📺 Fetching anime info: ${animeId} (source: ${source})\n`);

    if (source === 'auto' || source.startsWith('consumet')) {
      // Try Consumet providers
      const providers = [
        AnimeProvider.GOGOANIME,
        AnimeProvider.ZORO,
        AnimeProvider.ANIMEPAHE,
      ];

      for (const provider of providers) {
        try {
          const info = await consumetService.getAnimeInfo(animeId, provider);
          if (info) {
            console.log(`✓ Got info from Consumet-${provider}\n`);
            return {
              ...info,
              source: `consumet-${provider}`,
            };
          }
        } catch (error) {
          console.log(`✗ Consumet-${provider} failed`);
        }
      }
    }

    if (source === 'auto' || source === 'gogoanime-improved') {
      // Try improved GoGoAnime scraper
      try {
        const info = await improvedGogoScraper.getAnimeInfo(animeId);
        if (info) {
          console.log('✓ Got info from GoGoAnime-Improved\n');
          return {
            id: info.id,
            title: info.title,
            image: info.image,
            description: info.description,
            genres: info.genres,
            episodes: info.episodes,
            totalEpisodes: info.totalEpisodes,
            source: 'gogoanime-improved',
          };
        }
      } catch (error) {
        console.log('✗ GoGoAnime-Improved failed');
      }
    }

    console.log('✗ All sources failed\n');
    return null;
  }

  /**
   * Get video sources with extraction and fallback
   */
  async getVideoSources(
    episodeId: string,
    source: string = 'auto'
  ): Promise<UnifiedVideoSource[]> {
    console.log(`\n🎬 Fetching video sources: ${episodeId} (source: ${source})\n`);

    const allSources: string[] = [];

    // Collect source URLs from different providers
    if (source === 'auto' || source.startsWith('consumet')) {
      try {
        const sources = await consumetService.getEpisodeSources(
          episodeId,
          AnimeProvider.GOGOANIME
        );
        if (sources) {
          allSources.push(...sources.sources.map(s => s.url));
        }
      } catch (error) {
        console.log('✗ Consumet sources failed');
      }
    }

    if (source === 'auto' || source === 'gogoanime-improved') {
      try {
        const sources = await improvedGogoScraper.getEpisodeSources(episodeId);
        allSources.push(...sources.map(s => s.url));
      } catch (error) {
        console.log('✗ GoGoAnime sources failed');
      }
    }

    // Extract video URLs with decryption
    console.log(`Found ${allSources.length} source URLs, extracting...`);

    const extractedData = await videoExtractor.extractWithFallback(allSources);

    if (!extractedData) {
      console.log('✗ Video extraction failed\n');
      return [];
    }

    console.log(`✓ Extracted ${extractedData.sources.length} video sources\n`);

    return extractedData.sources.map(source => ({
      url: source.url,
      quality: source.quality,
      type: source.isM3U8 ? 'm3u8' : 'mp4',
      headers: source.headers,
      subtitles: extractedData.subtitles,
    }));
  }

  /**
   * Complete workflow: Search -> Get Info -> Get Sources
   */
  async getAnimeAndSources(
    searchQuery: string,
    episodeNumber: number = 1
  ): Promise<{
    anime: UnifiedAnimeInfo | null;
    sources: UnifiedVideoSource[];
  }> {
    console.log(`\n🎯 Complete workflow for: "${searchQuery}" Episode ${episodeNumber}\n`);

    // Step 1: Search
    const searchResults = await this.search(searchQuery);

    // Get first result from any source
    const firstResult =
      searchResults.consumet[0] ||
      searchResults.gogoanime[0] ||
      searchResults.multiSource[0];

    if (!firstResult) {
      console.log('✗ No search results found\n');
      return { anime: null, sources: [] };
    }

    console.log(`Selected: ${firstResult.title} (${firstResult.source})`);

    // Step 2: Get anime info
    const animeInfo = await this.getAnimeInfo(firstResult.id, firstResult.source);

    if (!animeInfo) {
      console.log('✗ Could not get anime info\n');
      return { anime: null, sources: [] };
    }

    // Step 3: Get episode
    const episode = animeInfo.episodes.find(ep => ep.number === episodeNumber);

    if (!episode) {
      console.log(`✗ Episode ${episodeNumber} not found\n`);
      return { anime: animeInfo, sources: [] };
    }

    console.log(`Found episode: ${episode.title}`);

    // Step 4: Get video sources
    const sources = await this.getVideoSources(episode.id, animeInfo.source);

    return { anime: animeInfo, sources };
  }

  /**
   * Get recent episodes across all sources
   */
  async getRecentEpisodes(): Promise<any[]> {
    console.log('\n📅 Fetching recent episodes from all sources\n');

    const [consumetRecent, gogoRecent] = await Promise.allSettled([
      consumetService.getRecentEpisodes(AnimeProvider.GOGOANIME),
      improvedGogoScraper.getRecentEpisodes(),
    ]);

    const recent: any[] = [];

    if (consumetRecent.status === 'fulfilled') {
      recent.push(...consumetRecent.value.map(ep => ({ ...ep, source: 'consumet' })));
    }

    if (gogoRecent.status === 'fulfilled') {
      recent.push(...gogoRecent.value.map(ep => ({ ...ep, source: 'gogoanime' })));
    }

    console.log(`✓ Found ${recent.length} recent episodes\n`);
    return recent;
  }
}

// Export singleton
export const unifiedAnimeService = new UnifiedAnimeService();

/**
 * Convenience functions
 */
export const searchAllSources = (query: string) =>
  unifiedAnimeService.search(query);

export const getAnimeWithFallback = (animeId: string, source?: string) =>
  unifiedAnimeService.getAnimeInfo(animeId, source);

export const getVideoWithExtraction = (episodeId: string, source?: string) =>
  unifiedAnimeService.getVideoSources(episodeId, source);

export const getCompleteAnimeData = (searchQuery: string, episodeNumber?: number) =>
  unifiedAnimeService.getAnimeAndSources(searchQuery, episodeNumber);
