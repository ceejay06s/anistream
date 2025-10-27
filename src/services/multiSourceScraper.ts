/**
 * Multi-Source Anime Scraper
 * Custom implementations for Zoro, 9anime, AnimePahe
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScraperSource {
  url: string;
  quality: string;
  type: 'mp4' | 'm3u8' | 'dash';
  headers?: Record<string, string>;
  subtitles?: Array<{
    url: string;
    lang: string;
  }>;
}

export interface ScraperEpisode {
  id: string;
  number: number;
  title: string;
  thumbnail?: string;
}

export interface ScraperAnimeInfo {
  id: string;
  title: string;
  image?: string;
  description?: string;
  genres?: string[];
  episodes: ScraperEpisode[];
  totalEpisodes: number;
}

/**
 * Zoro.to Scraper (formerly AniWatch)
 */
export class ZoroScraper {
  private baseUrl = 'https://aniwatch.to';

  async search(query: string): Promise<any[]> {
    try {
      console.log('Searching Zoro for:', query);
      const searchUrl = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}`;

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const results: any[] = [];

      $('.film_list-wrap .flw-item').each((_, element) => {
        const $el = $(element);
        const title = $el.find('.film-name a').text().trim();
        const id = $el.find('.film-name a').attr('href')?.split('/')[1] || '';
        const image = $el.find('.film-poster-img').attr('data-src');
        const episodeCount = $el.find('.tick-item.tick-eps').text().trim();

        if (title && id) {
          results.push({
            id,
            title,
            image,
            totalEpisodes: episodeCount,
            url: `${this.baseUrl}${$el.find('.film-name a').attr('href')}`,
          });
        }
      });

      console.log(`Found ${results.length} results from Zoro`);
      return results;
    } catch (error) {
      console.error('Zoro search error:', error);
      return [];
    }
  }

  async getAnimeInfo(animeId: string): Promise<ScraperAnimeInfo | null> {
    try {
      console.log('Fetching Zoro anime info:', animeId);
      const url = `${this.baseUrl}/${animeId}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      const title = $('.film-name').text().trim();
      const image = $('.film-poster-img').attr('src');
      const description = $('.film-description').text().trim();

      const genres: string[] = [];
      $('.item-list a[href*="/genre/"]').each((_, el) => {
        genres.push($(el).text().trim());
      });

      // Get episodes
      const episodes: ScraperEpisode[] = [];
      const dataId = $('#wrapper').attr('data-id');

      if (dataId) {
        const episodesResponse = await axios.get(
          `${this.baseUrl}/ajax/v2/episode/list/${dataId}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'X-Requested-With': 'XMLHttpRequest',
            },
          }
        );

        const $eps = cheerio.load(episodesResponse.data.html);
        $eps('.ep-item').each((_, el) => {
          const $ep = $(el);
          const epId = $ep.attr('data-id') || '';
          const epNumber = parseInt($ep.attr('data-number') || '0');
          const epTitle = $ep.attr('title') || `Episode ${epNumber}`;

          episodes.push({
            id: epId,
            number: epNumber,
            title: epTitle,
          });
        });
      }

      return {
        id: animeId,
        title,
        image,
        description,
        genres,
        episodes,
        totalEpisodes: episodes.length,
      };
    } catch (error) {
      console.error('Zoro anime info error:', error);
      return null;
    }
  }

  async getEpisodeSources(episodeId: string): Promise<ScraperSource[]> {
    try {
      console.log('Fetching Zoro episode sources:', episodeId);

      // Get streaming servers
      const serversResponse = await axios.get(
        `${this.baseUrl}/ajax/v2/episode/servers?episodeId=${episodeId}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      );

      const $ = cheerio.load(serversResponse.data.html);
      const sources: ScraperSource[] = [];

      // Get first available server
      const serverId = $('.server-item').first().attr('data-id');

      if (serverId) {
        const sourceResponse = await axios.get(
          `${this.baseUrl}/ajax/v2/episode/sources?id=${serverId}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'X-Requested-With': 'XMLHttpRequest',
            },
          }
        );

        const sourceUrl = sourceResponse.data.link;

        if (sourceUrl) {
          sources.push({
            url: sourceUrl,
            quality: 'auto',
            type: sourceUrl.includes('.m3u8') ? 'm3u8' : 'mp4',
            headers: {
              'Referer': this.baseUrl,
              'Origin': this.baseUrl,
            },
          });
        }
      }

      return sources;
    } catch (error) {
      console.error('Zoro episode sources error:', error);
      return [];
    }
  }
}

/**
 * AnimePahe Scraper
 */
export class AnimePaheScraper {
  private baseUrl = 'https://animepahe.com';
  private apiUrl = 'https://animepahe.com/api';

  async search(query: string): Promise<any[]> {
    try {
      console.log('Searching AnimePahe for:', query);

      const response = await axios.get(`${this.apiUrl}`, {
        params: {
          m: 'search',
          q: query,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const results = response.data.data.map((anime: any) => ({
        id: anime.session,
        title: anime.title,
        image: anime.poster,
        totalEpisodes: anime.episodes,
        type: anime.type,
        status: anime.status,
        year: anime.year,
      }));

      console.log(`Found ${results.length} results from AnimePahe`);
      return results;
    } catch (error) {
      console.error('AnimePahe search error:', error);
      return [];
    }
  }

  async getAnimeInfo(animeSession: string): Promise<ScraperAnimeInfo | null> {
    try {
      console.log('Fetching AnimePahe anime info:', animeSession);

      // Get episodes
      const response = await axios.get(`${this.apiUrl}`, {
        params: {
          m: 'release',
          id: animeSession,
          sort: 'episode_asc',
          page: 1,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const data = response.data;
      const episodes: ScraperEpisode[] = [];

      data.data.forEach((ep: any) => {
        episodes.push({
          id: ep.session,
          number: ep.episode,
          title: `Episode ${ep.episode}`,
          thumbnail: ep.snapshot,
        });
      });

      return {
        id: animeSession,
        title: data.title || 'Unknown',
        image: undefined,
        episodes,
        totalEpisodes: data.total,
      };
    } catch (error) {
      console.error('AnimePahe anime info error:', error);
      return null;
    }
  }

  async getEpisodeSources(episodeSession: string): Promise<ScraperSource[]> {
    try {
      console.log('Fetching AnimePahe episode sources:', episodeSession);

      const response = await axios.get(`${this.apiUrl}`, {
        params: {
          m: 'links',
          id: episodeSession,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const sources: ScraperSource[] = [];
      const data = response.data.data;

      // AnimePahe provides quality variants
      Object.entries(data).forEach(([quality, info]: [string, any]) => {
        if (info.kwik) {
          sources.push({
            url: info.kwik,
            quality: quality,
            type: 'mp4',
            headers: {
              'Referer': this.baseUrl,
            },
          });
        }
      });

      return sources;
    } catch (error) {
      console.error('AnimePahe episode sources error:', error);
      return [];
    }
  }
}

/**
 * 9anime Scraper
 */
export class NineAnimeScraper {
  private baseUrl = 'https://9anime.to';

  async search(query: string): Promise<any[]> {
    try {
      console.log('Searching 9anime for:', query);
      const searchUrl = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}`;

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const results: any[] = [];

      $('.film_list-wrap .flw-item').each((_, element) => {
        const $el = $(element);
        const title = $el.find('.film-name a').text().trim();
        const href = $el.find('.film-name a').attr('href') || '';
        const id = href.split('/').pop()?.split('?')[0] || '';
        const image = $el.find('.film-poster-img').attr('data-src');

        if (title && id) {
          results.push({
            id,
            title,
            image,
            url: `${this.baseUrl}${href}`,
          });
        }
      });

      console.log(`Found ${results.length} results from 9anime`);
      return results;
    } catch (error) {
      console.error('9anime search error:', error);
      return [];
    }
  }

  async getAnimeInfo(animeId: string): Promise<ScraperAnimeInfo | null> {
    try {
      console.log('Fetching 9anime anime info:', animeId);
      const url = `${this.baseUrl}/watch/${animeId}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const $ = cheerio.load(response.data);

      const title = $('.film-name').text().trim();
      const image = $('.film-poster-img').attr('src');
      const description = $('.film-description .text').text().trim();

      const episodes: ScraperEpisode[] = [];
      $('.ep-item').each((_, el) => {
        const $ep = $(el);
        const epId = $ep.attr('data-id') || '';
        const epNumber = parseInt($ep.attr('data-number') || '0');
        const epTitle = $ep.attr('title') || `Episode ${epNumber}`;

        episodes.push({
          id: epId,
          number: epNumber,
          title: epTitle,
        });
      });

      return {
        id: animeId,
        title,
        image,
        description,
        episodes,
        totalEpisodes: episodes.length,
      };
    } catch (error) {
      console.error('9anime anime info error:', error);
      return null;
    }
  }

  async getEpisodeSources(episodeId: string): Promise<ScraperSource[]> {
    try {
      console.log('Fetching 9anime episode sources:', episodeId);

      // 9anime requires complex decryption
      // This is a simplified version
      const sources: ScraperSource[] = [];

      // Note: 9anime uses encrypted sources that require additional decryption
      console.warn('9anime sources require additional decryption logic');

      return sources;
    } catch (error) {
      console.error('9anime episode sources error:', error);
      return [];
    }
  }
}

/**
 * Unified Multi-Source Manager
 */
export class MultiSourceManager {
  private zoro = new ZoroScraper();
  private animePahe = new AnimePaheScraper();
  private nineAnime = new NineAnimeScraper();

  async searchAll(query: string) {
    const [zoroResults, paheResults, nineAnimeResults] = await Promise.allSettled([
      this.zoro.search(query),
      this.animePahe.search(query),
      this.nineAnime.search(query),
    ]);

    return {
      zoro: zoroResults.status === 'fulfilled' ? zoroResults.value : [],
      animePahe: paheResults.status === 'fulfilled' ? paheResults.value : [],
      nineAnime: nineAnimeResults.status === 'fulfilled' ? nineAnimeResults.value : [],
    };
  }

  async getSourcesWithFallback(
    animeId: string,
    episodeNumber: number,
    sourceType: 'zoro' | 'animePahe' | 'nineAnime' = 'zoro'
  ): Promise<ScraperSource[]> {
    const scrapers = {
      zoro: this.zoro,
      animePahe: this.animePahe,
      nineAnime: this.nineAnime,
    };

    const scraper = scrapers[sourceType];

    try {
      const animeInfo = await scraper.getAnimeInfo(animeId);
      if (!animeInfo) return [];

      const episode = animeInfo.episodes.find(ep => ep.number === episodeNumber);
      if (!episode) return [];

      return await scraper.getEpisodeSources(episode.id);
    } catch (error) {
      console.error(`Error fetching sources from ${sourceType}:`, error);
      return [];
    }
  }
}

// Export singleton
export const multiSourceManager = new MultiSourceManager();
