/**
 * Improved GoGoAnime Scraper
 * Uses proper DOM parsing with Cheerio and better error handling
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const GOGOANIME_BASE = 'https://anitaku.pe';
const GOGOCDN_API = 'https://ajax.gogocdn.net';

export interface GogoSearchResult {
  id: string;
  title: string;
  image?: string;
  releaseDate?: string;
  subOrDub?: 'sub' | 'dub';
  url: string;
}

export interface GogoEpisode {
  id: string;
  number: number;
  title: string;
  url: string;
}

export interface GogoAnimeInfo {
  id: string;
  title: string;
  image?: string;
  description?: string;
  type?: string;
  releaseDate?: string;
  status?: string;
  genres: string[];
  otherNames: string[];
  episodes: GogoEpisode[];
  totalEpisodes: number;
}

export interface GogoSource {
  url: string;
  quality: string;
  isM3U8: boolean;
  server?: string;
}

/**
 * Improved GoGoAnime Scraper with Cheerio
 */
export class ImprovedGogoanimeScraper {
  private baseUrl = GOGOANIME_BASE;
  private ajaxUrl = GOGOCDN_API;

  /**
   * Get axios instance with proper headers
   */
  private getAxios() {
    return axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
    });
  }

  /**
   * Search for anime
   */
  async search(query: string, page: number = 1): Promise<GogoSearchResult[]> {
    try {
      console.log(`🔍 Searching GoGoAnime: "${query}" (page ${page})`);

      const url = `${this.baseUrl}/search.html`;
      const response = await this.getAxios().get(url, {
        params: { keyword: query },
      });

      const $ = cheerio.load(response.data);
      const results: GogoSearchResult[] = [];

      $('.items li').each((_, element) => {
        const $item = $(element);

        const $link = $item.find('.name a');
        const title = $link.attr('title') || $link.text().trim();
        const href = $link.attr('href') || '';
        const id = href.replace('/category/', '');

        const image = $item.find('.img img').attr('src');
        const releaseDate = $item.find('.released').text().replace('Released:', '').trim();

        if (id && title) {
          results.push({
            id,
            title,
            image,
            releaseDate,
            subOrDub: this.detectSubOrDub(title),
            url: `${this.baseUrl}/category/${id}`,
          });
        }
      });

      console.log(`✓ Found ${results.length} results from GoGoAnime`);
      return results;
    } catch (error: any) {
      console.error('GoGoAnime search error:', error.message);
      return [];
    }
  }

  /**
   * Get anime information with episodes
   */
  async getAnimeInfo(animeId: string): Promise<GogoAnimeInfo | null> {
    try {
      console.log(`📺 Fetching anime info: ${animeId}`);

      const url = `${this.baseUrl}/category/${animeId}`;
      const response = await this.getAxios().get(url);
      const $ = cheerio.load(response.data);

      // Extract basic info
      const title = $('.anime_info_body_bg h1').text().trim();
      const image = $('.anime_info_body_bg img').attr('src');

      // Extract metadata
      const type = this.extractMetadata($, 'Type:');
      const releaseDate = this.extractMetadata($, 'Released:');
      const status = this.extractMetadata($, 'Status:');

      // Extract description
      const description = $('.anime_info_body_bg .description').text()
        .replace('Plot Summary:', '').trim();

      // Extract genres
      const genres: string[] = [];
      $('.anime_info_body_bg .type').each((_, el) => {
        const text = $(el).text();
        if (text.includes('Genre:')) {
          $(el).find('a').each((_, a) => {
            genres.push($(a).text().trim());
          });
        }
      });

      // Extract other names
      const otherNames: string[] = [];
      const otherNamesText = this.extractMetadata($, 'Other name:');
      if (otherNamesText) {
        otherNames.push(...otherNamesText.split(',').map(n => n.trim()));
      }

      // Get episodes
      const movieId = $('#movie_id').attr('value');
      const episodes = await this.getEpisodesList(animeId, movieId || '');

      console.log(`✓ Retrieved ${episodes.length} episodes for ${title}`);

      return {
        id: animeId,
        title,
        image,
        description,
        type,
        releaseDate,
        status,
        genres,
        otherNames,
        episodes,
        totalEpisodes: episodes.length,
      };
    } catch (error: any) {
      console.error('GoGoAnime anime info error:', error.message);
      return null;
    }
  }

  /**
   * Get episodes list from AJAX API
   */
  private async getEpisodesList(animeId: string, movieId: string): Promise<GogoEpisode[]> {
    try {
      // Try AJAX endpoint first
      if (movieId) {
        const ajaxUrl = `${this.ajaxUrl}/ajax/load-list-episode`;
        const response = await this.getAxios().get(ajaxUrl, {
          params: {
            ep_start: 0,
            ep_end: 10000,
            id: movieId,
          },
        });

        const $ = cheerio.load(response.data);
        const episodes: GogoEpisode[] = [];

        $('#episode_related li').each((_, el) => {
          const $ep = $(el);
          const $link = $ep.find('a');

          const href = $link.attr('href')?.trim() || '';
          const episodeId = href.replace('/', '');
          const epNumText = $link.find('.name').text().trim().replace('EP', '').trim();
          const epNumber = parseInt(epNumText) || 0;

          if (episodeId && epNumber > 0) {
            episodes.push({
              id: episodeId,
              number: epNumber,
              title: `Episode ${epNumber}`,
              url: `${this.baseUrl}/${episodeId}`,
            });
          }
        });

        // Sort by episode number (ascending)
        episodes.sort((a, b) => a.number - b.number);

        return episodes;
      }

      // Fallback: Generate episodes based on pattern
      return this.generateEpisodesFromPattern(animeId, 12);
    } catch (error) {
      console.error('Error fetching episodes list:', error);
      return this.generateEpisodesFromPattern(animeId, 12);
    }
  }

  /**
   * Generate episodes from pattern (fallback)
   */
  private generateEpisodesFromPattern(animeId: string, count: number = 12): GogoEpisode[] {
    const episodes: GogoEpisode[] = [];
    for (let i = 1; i <= count; i++) {
      episodes.push({
        id: `${animeId}-episode-${i}`,
        number: i,
        title: `Episode ${i}`,
        url: `${this.baseUrl}/${animeId}-episode-${i}`,
      });
    }
    return episodes;
  }

  /**
   * Get streaming sources for an episode
   */
  async getEpisodeSources(episodeId: string): Promise<GogoSource[]> {
    try {
      console.log(`🎬 Fetching sources for: ${episodeId}`);

      const url = `${this.baseUrl}/${episodeId}`;
      const response = await this.getAxios().get(url);
      const $ = cheerio.load(response.data);

      const sources: GogoSource[] = [];

      // Extract iframe sources
      $('.play-video iframe').each((_, iframe) => {
        const src = $(iframe).attr('src');
        if (src) {
          const fullSrc = src.startsWith('//') ? `https:${src}` : src;
          sources.push({
            url: fullSrc,
            quality: 'default',
            isM3U8: fullSrc.includes('.m3u8'),
            server: this.detectServer(fullSrc),
          });
        }
      });

      // Extract download links
      $('.dowloads a').each((_, link) => {
        const href = $(link).attr('href');
        const quality = $(link).text().toLowerCase();

        if (href) {
          sources.push({
            url: href,
            quality: quality.includes('1080') ? '1080p' :
                    quality.includes('720') ? '720p' :
                    quality.includes('480') ? '480p' :
                    quality.includes('360') ? '360p' : 'default',
            isM3U8: href.includes('.m3u8'),
            server: 'download',
          });
        }
      });

      console.log(`✓ Found ${sources.length} sources`);
      return sources;
    } catch (error: any) {
      console.error('GoGoAnime episode sources error:', error.message);
      return [];
    }
  }

  /**
   * Get recent episodes
   */
  async getRecentEpisodes(page: number = 1, type: number = 1): Promise<any[]> {
    try {
      console.log(`📅 Fetching recent episodes (page ${page})`);

      const url = `${this.ajaxUrl}/ajax/page-recent-release.html`;
      const response = await this.getAxios().get(url, {
        params: { page, type },
      });

      const $ = cheerio.load(response.data);
      const episodes: any[] = [];

      $('.items li').each((_, el) => {
        const $item = $(el);
        const title = $item.find('.name a').attr('title') || '';
        const episodeId = $item.find('.name a').attr('href')?.replace('/', '') || '';
        const image = $item.find('.img a img').attr('src');
        const episode = $item.find('.episode').text().trim();

        if (episodeId) {
          episodes.push({
            id: episodeId,
            title,
            image,
            episode,
          });
        }
      });

      console.log(`✓ Found ${episodes.length} recent episodes`);
      return episodes;
    } catch (error: any) {
      console.error('GoGoAnime recent episodes error:', error.message);
      return [];
    }
  }

  /**
   * Helper: Extract metadata from page
   */
  private extractMetadata($: cheerio.CheerioAPI, label: string): string {
    let result = '';
    $('.anime_info_body_bg .type').each((_, el) => {
      const text = $(el).text();
      if (text.includes(label)) {
        result = text.replace(label, '').trim();
        // Remove genre links if present
        $(el).find('a').each((_, a) => {
          result = result.replace($(a).text(), '');
        });
        result = result.replace(/,\s*,/g, ',').trim();
      }
    });
    return result;
  }

  /**
   * Helper: Detect sub or dub from title
   */
  private detectSubOrDub(title: string): 'sub' | 'dub' {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('dub')) return 'dub';
    return 'sub';
  }

  /**
   * Helper: Detect server from URL
   */
  private detectServer(url: string): string {
    if (url.includes('gogoplay')) return 'gogoplay';
    if (url.includes('vidstreaming')) return 'vidstreaming';
    if (url.includes('doodstream')) return 'doodstream';
    if (url.includes('streamwish')) return 'streamwish';
    return 'unknown';
  }
}

// Export singleton
export const improvedGogoScraper = new ImprovedGogoanimeScraper();

/**
 * Convenience functions
 */
export const searchGogoanime = (query: string, page?: number) =>
  improvedGogoScraper.search(query, page);

export const getGogoAnimeInfo = (animeId: string) =>
  improvedGogoScraper.getAnimeInfo(animeId);

export const getGogoEpisodeSources = (episodeId: string) =>
  improvedGogoScraper.getEpisodeSources(episodeId);

export const getGogoRecentEpisodes = (page?: number) =>
  improvedGogoScraper.getRecentEpisodes(page);
