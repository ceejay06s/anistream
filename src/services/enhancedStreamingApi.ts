/**
 * Enhanced Streaming API
 * Combines all scraping methods with intelligent fallback
 */

import { unifiedAnimeService } from './unifiedAnimeService';
import { consumetService, AnimeProvider } from './consumetService';
import { improvedGogoScraper } from './improvedGogoanimeScraper';
import { multiSourceManager } from './multiSourceScraper';

export interface EnhancedStreamingSource {
  url: string;
  quality: string;
  type: 'mp4' | 'm3u8';
  headers?: Record<string, string>;
  server?: string;
}

export interface EnhancedAnimeInfo {
  id: string;
  title: string;
  image?: string;
  description?: string;
  genres?: string[];
  episodes: Array<{
    id: string;
    number: number;
    title: string;
    image?: string;
  }>;
  totalEpisodes: number;
  source: string;
}

/**
 * Enhanced Streaming API with multiple sources
 */
export class EnhancedStreamingApi {
  /**
   * Search across all available sources
   */
  async searchAnime(query: string) {
    console.log(`\n🔍 Enhanced Search: "${query}"\n`);

    try {
      // Use unified service for comprehensive search
      const results = await unifiedAnimeService.search(query);

      // Combine all results
      const combined = [
        ...results.consumet.map(r => ({ ...r, provider: 'consumet' })),
        ...results.gogoanime.map(r => ({ ...r, provider: 'gogoanime' })),
        ...results.multiSource.map(r => ({ ...r, provider: 'multi' })),
      ];

      console.log(`✓ Total results: ${combined.length}\n`);
      return combined;
    } catch (error) {
      console.error('Enhanced search error:', error);
      return [];
    }
  }

  /**
   * Get anime info with automatic source detection
   */
  async getAnimeInfo(animeId: string, source?: string): Promise<EnhancedAnimeInfo | null> {
    console.log(`\n📺 Getting anime info: ${animeId}`);

    try {
      // Try unified service first
      const info = await unifiedAnimeService.getAnimeInfo(animeId, source || 'auto');

      if (info) {
        console.log(`✓ Found info: ${info.title} (${info.totalEpisodes} episodes)\n`);
        return info;
      }

      // Fallback to individual providers
      const providers = [
        AnimeProvider.GOGOANIME,
        AnimeProvider.ZORO,
        AnimeProvider.ANIMEPAHE,
      ];

      for (const provider of providers) {
        try {
          const consumetInfo = await consumetService.getAnimeInfo(animeId, provider);
          if (consumetInfo) {
            console.log(`✓ Found via Consumet-${provider}\n`);
            return {
              ...consumetInfo,
              source: `consumet-${provider}`,
            };
          }
        } catch (error) {
          console.log(`✗ ${provider} failed`);
        }
      }

      console.log('✗ All sources failed\n');
      return null;
    } catch (error) {
      console.error('Get anime info error:', error);
      return null;
    }
  }

  /**
   * Get video sources with best quality selection
   */
  async getVideoSources(
    episodeId: string,
    source?: string
  ): Promise<EnhancedStreamingSource[]> {
    console.log(`\n🎬 Getting video sources: ${episodeId}`);

    try {
      // Try unified service first (includes video extraction)
      const sources = await unifiedAnimeService.getVideoSources(episodeId, source || 'auto');

      if (sources && sources.length > 0) {
        console.log(`✓ Found ${sources.length} sources\n`);
        return sources.map(s => ({
          url: s.url,
          quality: s.quality,
          type: s.type,
          headers: s.headers,
          server: 'unified',
        }));
      }

      // Fallback: Try Consumet providers
      console.log('Unified service failed, trying Consumet...');

      const providers = [
        AnimeProvider.GOGOANIME,
        AnimeProvider.ZORO,
        AnimeProvider.ANIMEPAHE,
      ];

      for (const provider of providers) {
        try {
          const consumetSources = await consumetService.getEpisodeSources(episodeId, provider);
          if (consumetSources && consumetSources.sources.length > 0) {
            console.log(`✓ Found via Consumet-${provider}\n`);
            return consumetSources.sources.map(s => ({
              url: s.url,
              quality: s.quality,
              type: s.isM3U8 ? 'm3u8' : 'mp4',
              headers: {
                'Referer': 'https://gogoplay.io/',
              },
              server: provider,
            }));
          }
        } catch (error) {
          console.log(`✗ Consumet-${provider} failed`);
        }
      }

      // Last resort: GoGoAnime scraper
      console.log('Trying improved GoGoAnime scraper...');
      const gogoSources = await improvedGogoScraper.getEpisodeSources(episodeId);

      if (gogoSources.length > 0) {
        console.log(`✓ Found ${gogoSources.length} GoGoAnime sources\n`);
        return gogoSources.map(s => ({
          url: s.url,
          quality: s.quality,
          type: s.isM3U8 ? 'm3u8' : 'mp4',
          headers: {
            'Referer': 'https://gogoplay.io/',
          },
          server: 'gogoanime',
        }));
      }

      console.log('✗ All video sources failed\n');
      return [];
    } catch (error) {
      console.error('Get video sources error:', error);
      return [];
    }
  }

  /**
   * Get trending/recent anime
   */
  async getTrending(page: number = 1) {
    console.log(`\n📊 Getting trending anime (page ${page})`);

    try {
      const recent = await unifiedAnimeService.getRecentEpisodes();
      console.log(`✓ Found ${recent.length} recent episodes\n`);
      return recent;
    } catch (error) {
      console.error('Get trending error:', error);
      return [];
    }
  }

  /**
   * Quick search and play workflow
   */
  async quickPlay(animeName: string, episodeNumber: number = 1) {
    console.log(`\n⚡ Quick Play: ${animeName} Episode ${episodeNumber}\n`);

    try {
      const { anime, sources } = await unifiedAnimeService.getAnimeAndSources(
        animeName,
        episodeNumber
      );

      if (!anime || !sources || sources.length === 0) {
        console.log('✗ Quick play failed\n');
        return null;
      }

      console.log(`✓ Ready to play: ${anime.title} Episode ${episodeNumber}\n`);
      return {
        anime,
        sources: sources.map(s => ({
          url: s.url,
          quality: s.quality,
          type: s.type,
          headers: s.headers,
        })),
      };
    } catch (error) {
      console.error('Quick play error:', error);
      return null;
    }
  }
}

// Export singleton
export const enhancedStreamingApi = new EnhancedStreamingApi();

/**
 * Convenience functions for backward compatibility
 */
export const searchEnhanced = (query: string) =>
  enhancedStreamingApi.searchAnime(query);

export const getAnimeInfoEnhanced = (animeId: string, source?: string) =>
  enhancedStreamingApi.getAnimeInfo(animeId, source);

export const getVideoSourcesEnhanced = (episodeId: string, source?: string) =>
  enhancedStreamingApi.getVideoSources(episodeId, source);

export const getTrendingEnhanced = (page?: number) =>
  enhancedStreamingApi.getTrending(page);

export const quickPlayAnime = (animeName: string, episodeNumber?: number) =>
  enhancedStreamingApi.quickPlay(animeName, episodeNumber);
