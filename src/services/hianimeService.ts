/**
 * HiAnime Service
 * 
 * Service for fetching anime data from HiAnime.to (formerly AniWatch.to)
 * Uses the aniwatch npm package for React Native, falls back to web scraping for web browsers
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Anime, Episode } from '../types';

// Check if we're in a web environment
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

// HiAnime base URL (hianimez.to is the actual domain used by hianime-API)
const HIANIME_BASE_URL = 'https://hianime.to';
const HIANIMEZ_BASE_URL = 'https://hianimez.to'; // Alternative domain
const HIANIME_SEARCH_URL = `${HIANIME_BASE_URL}/search`;

// Optional: hianime-API endpoint (if deployed)
// Set this to your deployed hianime-API instance URL, e.g., 'http://localhost:3030/api/v1'
const HIANIME_API_BASE_URL = process.env.HIANIME_API_URL || null;

// Hi-API (aniwatch-api) configuration
// This is the local hi-api instance (PacaHat/hi-api) running on port 4000
const HI_API_URL = process.env.HI_API_URL || 'http://localhost:4000';
const HI_API_BASE_PATH = '/api/v2/hianime';
const HI_API_ENABLED = process.env.HI_API_ENABLED !== 'false'; // Default: enabled

// Backend proxy server URL (for web browsers to bypass CORS)
// Default: http://localhost:1000 (matches backend/proxy-server.js)
const PROXY_SERVER_URL = process.env.PROXY_SERVER_URL || 'http://localhost:1000';

// Initialize scraper instance
let scraper: any = null;
let aniwatchModule: any = null;

/**
 * Clean anime ID by removing numeric suffixes (e.g., "hoshi-no-umi-no-amuri-8552" -> "hoshi-no-umi-no-amuri")
 * This ensures we use the base slug without the numeric ID suffix
 * 
 * Handles URLs like:
 * - "watch/jack-of-all-trades-party-of-none-20333" -> "jack-of-all-trades-party-of-none"
 * - "watch/jack-of-all-trades-party-of-none-20333?w=latest&ep=164153" -> "jack-of-all-trades-party-of-none"
 * - "/watch/hoshi-no-umi-no-amuri-8552" -> "hoshi-no-umi-no-amuri"
 */
const cleanAnimeId = (animeId: string): string => {
  if (!animeId) return animeId;
  
  // Remove leading/trailing slashes and 'watch/' prefix
  let cleaned = animeId.toString().trim();
  
  // Remove query parameters if present (e.g., "?w=latest&ep=164153")
  cleaned = cleaned.split('?')[0];
  
  cleaned = cleaned.replace(/^\/+|\/+$/g, '');
  cleaned = cleaned.replace(/^watch\//, '');
  
  // Remove numeric suffix at the end (e.g., "-8552", "-12345", "-20333")
  // Pattern: one or more digits preceded by a hyphen at the end of the string
  // This handles cases like "jack-of-all-trades-party-of-none-20333" -> "jack-of-all-trades-party-of-none"
  cleaned = cleaned.replace(/-\d+$/, '');
  
  return cleaned;
};

const getScraper = (): any => {
  // HiAnime scraper doesn't work in web browsers (Node.js only)
  if (isWeb) {
    console.warn('HiAnime scraper is not available in web browsers (Node.js only)');
    return null;
  }

  if (!scraper) {
    try {
      // Dynamically import aniwatch (Node.js only)
      if (!aniwatchModule) {
        try {
          // Use require for Node.js environment
          aniwatchModule = require('aniwatch');
        } catch (requireError: any) {
          console.warn('Failed to require aniwatch package (web environment?):', requireError?.message);
          return null;
        }
      }
      
      // Check if module loaded successfully
      if (!aniwatchModule) {
        console.error('aniwatch module is null or undefined');
        return null;
      }
      
      // aniwatch exports HiAnime object with Scraper property
      const HiAnime = aniwatchModule?.HiAnime;
      
      if (!HiAnime) {
        console.error('HiAnime not found in aniwatch package');
        return null;
      }
      
      // HiAnime has a Scraper property that is the actual scraper class
      const ScraperClass = HiAnime.Scraper;
      
      if (!ScraperClass) {
        console.error('HiAnime.Scraper not found');
        return null;
      }
      
      // Instantiate the Scraper class
      scraper = new ScraperClass();
      console.log('HiAnime scraper initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize HiAnime scraper:', error);
      return null;
    }
  }
  return scraper;
};

/**
 * Search anime using hianime-API (if deployed)
 */
const searchHiAnimeAPI = async (query: string, page: number = 1): Promise<any[]> => {
  if (!HIANIME_API_BASE_URL) {
    return [];
  }

  try {
    const response = await axios.get(`${HIANIME_API_BASE_URL}/search`, {
      params: { keyword: query, page },
      timeout: 10000,
    });

    if (response.data?.success && response.data?.data) {
      const results = Array.isArray(response.data.data) 
        ? response.data.data 
        : response.data.data.results || [];
      console.log(`HiAnime API search result for "${query}": ${results.length} items`);
      return results;
    }
    return [];
  } catch (error: any) {
    console.warn('HiAnime API search failed:', error?.message);
    return [];
  }
};

/**
 * Search anime on HiAnime using backend proxy (for web browsers)
 */
const searchHiAnimeProxy = async (query: string, page: number = 1): Promise<any[]> => {
  try {
    const response = await axios.get(`${PROXY_SERVER_URL}/scrape/hianime/search`, {
      params: { query, page },
      timeout: 15000,
    });

    if (response.data?.success && response.data?.data) {
      console.log(`HiAnime proxy search result for "${query}": ${response.data.data.length} items`);
      return response.data.data;
    }
    return [];
  } catch (error: any) {
    console.warn('HiAnime proxy search failed:', error?.message);
    return [];
  }
};

/**
 * Search anime on HiAnime using web scraping (based on hianime-API patterns)
 */
const searchHiAnimeWeb = async (query: string, page: number = 1): Promise<any[]> => {
  // In web browsers, use proxy server to bypass CORS
  if (isWeb) {
    return await searchHiAnimeProxy(query, page);
  }

  try {
    // Try hianimez.to first (used by hianime-API), then fallback to hianime.to
    const baseUrls = [HIANIMEZ_BASE_URL, HIANIME_BASE_URL];
    
    for (const baseUrl of baseUrls) {
      try {
        const searchUrl = `${baseUrl}/search?keyword=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`;
        
        // Build headers - don't set User-Agent in web (browsers forbid it)
        const headers: Record<string, string> = {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };
        
        const response = await axios.get(searchUrl, {
          headers,
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        const results: any[] = [];

        // Selectors based on hianime-API scraping patterns
        $('.film_list-wrap .flw-item, .item-inner, .anime-card, .film_list .flw-item').each((_, element) => {
          const $item = $(element);
          const link = $item.find('a').first().attr('href');
          const title = $item.find('.film-name, .anime-title, h3, h2, .dynamic-name').first().text().trim() ||
                       $item.find('a').first().attr('title') || '';
          const image = $item.find('img').first().attr('src') || 
                       $item.find('img').first().attr('data-src') ||
                       $item.find('img').first().attr('data-original') ||
                       $item.find('img').first().attr('data-lazy-src') || '';
          const type = $item.find('.fdi-type, .type, .film-type').text().trim() || '';
          const rating = parseFloat($item.find('.rating, .score').text().trim() || '0') || 0;
          const released = $item.find('.fdi-year, .year').text().trim() || '';

          if (link && title) {
            // Extract anime ID from URL (e.g., /watch/jujutsu-kaisen-100 -> jujutsu-kaisen-100)
            // Clean to remove numeric suffixes (e.g., "hoshi-no-umi-no-amuri-8552" -> "hoshi-no-umi-no-amuri")
            const animeId = cleanAnimeId(link);
            const fullImageUrl = image 
              ? (image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)
              : '';
            
            results.push({
              id: animeId,
              title: title,
              image: fullImageUrl,
              type: type,
              rating: rating,
              released: released,
              url: link.startsWith('http') ? link : `${baseUrl}${link.startsWith('/') ? '' : '/'}${link}`,
            });
          }
        });

        if (results.length > 0) {
          console.log(`HiAnime web search result for "${query}": ${results.length} items`);
          return results;
        }
      } catch (urlError: any) {
        // Try next URL if this one fails
        continue;
      }
    }

    return [];
  } catch (error: any) {
    console.error('Error searching HiAnime (web scraping):', error);
    return [];
  }
};

/**
 * Search anime using hi-api (aniwatch-api)
 * Note: In web environments, this will fail due to CORS, so we skip it and use proxy instead
 */
const searchHiAnimeHiAPI = async (query: string, page: number = 1): Promise<any[]> => {
  if (!HI_API_ENABLED) {
    return [];
  }

  // Skip direct hi-api calls in web browsers (CORS issue) - use proxy instead
  if (isWeb) {
    return [];
  }

  try {
    const response = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/search`, {
      params: { q: query, page },
      timeout: 5000,
    });

    if (response.data && response.data.success && response.data.data) {
      const animes = response.data.data.animes || response.data.data.results || [];
      if (animes.length > 0) {
        const results = animes.map((item: any) => ({
          id: cleanAnimeId(item.id),
          title: item.name || item.title,
          image: item.poster || item.image || '',
          type: item.type || '',
          rating: item.rating || 0,
          url: item.url || `https://hianime.to/watch/${cleanAnimeId(item.id)}`,
        }));

        console.log(`✅ hi-api search: Found ${results.length} results`);
        return results;
      }
    }
    return [];
  } catch (error: any) {
    if (error.response) {
      console.log(`⚠️ hi-api search failed: ${error.response.status} - ${error.response.statusText}`);
    } else {
      console.log(`⚠️ hi-api search failed: ${error.message}`);
    }
    return [];
  }
};

/**
 * Search anime on HiAnime
 * Priority: hi-api > hianime-API > npm package > web scraping
 */
export const searchHiAnime = async (query: string, page: number = 1): Promise<any[]> => {
  // Try hi-api first (if enabled)
  if (HI_API_ENABLED) {
    const hiApiResults = await searchHiAnimeHiAPI(query, page);
    if (hiApiResults.length > 0) {
      return hiApiResults;
    }
  }

  // Try hianime-API (if deployed)
  if (HIANIME_API_BASE_URL) {
    const apiResults = await searchHiAnimeAPI(query, page);
    if (apiResults.length > 0) {
      return apiResults;
    }
  }

  // Try npm package (React Native only)
  if (!isWeb) {
    try {
      const instance = getScraper();
      if (instance && typeof instance.search === 'function') {
        const result = await instance.search(query);
        if (result) {
          // Handle different response formats
          const animes = result.animes || result || [];
          console.log('HiAnime search result (npm):', animes.length || 0, 'items');
          return Array.isArray(animes) ? animes : [];
        }
      }
    } catch (error: any) {
      console.warn('HiAnime npm search failed, falling back to web scraping:', error?.message);
    }
  }

  // Fallback to web scraping (works in both web and React Native)
  return await searchHiAnimeWeb(query, page);
};

/**
 * Get anime information using hi-api (aniwatch-api)
 * Note: In web environments, this will fail due to CORS, so we skip it and use proxy instead
 */
const getHiAnimeInfoHiAPI = async (animeId: string, originalAnimeId?: string): Promise<any> => {
  if (!HI_API_ENABLED) {
    return null;
  }

  // Skip direct hi-api calls in web browsers (CORS issue) - use proxy instead
  if (isWeb) {
    return null;
  }

  // Try cleaned ID first, then original ID if 404
  const animeIdsToTry = [animeId];
  if (originalAnimeId && originalAnimeId !== animeId && !/^\d+$/.test(originalAnimeId)) {
    animeIdsToTry.push(originalAnimeId);
  }

  for (const tryAnimeId of animeIdsToTry) {
    try {
      console.log(`🔍 Trying hi-api for animeId: ${tryAnimeId}`);
      const infoResponse = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${tryAnimeId}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      console.log(`   hi-api info response status: ${infoResponse.status}`);

      // If 404, try next ID
      if (infoResponse.status === 404) {
        console.log(`   hi-api returned 404 for ${tryAnimeId}, trying next ID...`);
        continue;
      }

      if (infoResponse.data && infoResponse.data.success && infoResponse.data.data) {
        const data = infoResponse.data.data;
        console.log(`   hi-api info success, title: ${data.title || data.name || 'N/A'}`);

        // Get episodes separately
        let episodes: any[] = [];
        try {
          const epResponse = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${tryAnimeId}/episodes`, {
            timeout: 5000,
          });

          if (epResponse.data && epResponse.data.success && epResponse.data.data) {
            const epData = epResponse.data.data;
            const rawEpisodes = epData.episodes || epData.sub || [];

            console.log(`   Found ${rawEpisodes.length} raw episodes from hi-api`);

            // Format episodes - IMPORTANT: Use episode.number, not episode.id
            // Use tryAnimeId (with numeric suffix) for episode IDs, not cleaned animeId
            episodes = rawEpisodes
              .filter((ep: any) => ep.number || ep.episode) // Only include episodes with valid numbers
              .map((ep: any) => {
                const epNum = ep.number || ep.episode || 0;
                // Use tryAnimeId (full ID with numeric suffix) for episode URLs
                return {
                  id: `${tryAnimeId}?ep=${epNum}`, // Use full ID with numeric suffix
                  number: epNum,
                  title: ep.title || `Episode ${epNum}`,
                  url: `https://hianime.to/watch/${tryAnimeId}?ep=${epNum}`,
                };
              });

            console.log(`   Formatted ${episodes.length} episodes`);
          }
        } catch (epError: any) {
          if (epError.response) {
            console.log(`⚠️ hi-api episodes failed: ${epError.response.status} - ${epError.response.statusText}`);
          } else {
            console.log(`⚠️ hi-api episodes failed: ${epError.message}`);
          }
          console.log('   Info will have no episodes');
        }

        console.log(`✅ hi-api info: Found ${episodes.length} episodes`);

        return {
          id: animeId, // Return cleaned ID for consistency
          title: data.title || data.name || '',
          image: data.poster || data.image || '',
          description: data.description || '',
          genres: data.genres || [],
          status: data.status || '',
          released: data.released || '',
          rating: data.rating || 0,
          type: data.type || '',
          duration: data.duration || '24 min',
          totalEpisodes: episodes.length,
          episodes: episodes,
        };
      }
    } catch (apiError: any) {
      if (apiError.response) {
        console.log(`⚠️ hi-api info failed for ${tryAnimeId}: ${apiError.response.status} - ${apiError.response.statusText}`);
        // If 404, try next ID
        if (apiError.response.status === 404 && animeIdsToTry.length > 1) {
          continue;
        }
      } else {
        console.log(`⚠️ hi-api info failed for ${tryAnimeId}: ${apiError.message}`);
      }
    }
  }

  return null;
};

/**
 * Get anime information using hianime-API (if deployed)
 */
const getHiAnimeInfoAPI = async (animeId: string): Promise<any> => {
  if (!HIANIME_API_BASE_URL) {
    return null;
  }

  try {
    const response = await axios.get(`${HIANIME_API_BASE_URL}/anime/${animeId}`, {
      timeout: 10000,
    });

    if (response.data?.success && response.data?.data) {
      console.log('HiAnime API getInfo result: success');
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.warn('HiAnime API getInfo failed:', error?.message);
    return null;
  }
};

/**
 * Get anime information using backend proxy (for web browsers)
 */
const getHiAnimeInfoProxy = async (animeId: string, originalAnimeId?: string): Promise<any> => {
  // Validate that animeId is not purely numeric (HiAnime uses slugs, not numeric IDs)
  if (/^\d+$/.test(animeId)) {
    console.warn('HiAnime proxy getInfo: animeId is purely numeric, skipping (HiAnime uses slugs, not numeric IDs)');
    return null;
  }

  try {
    // Use original ID if provided (with numeric suffix), otherwise use cleaned ID
    const idToUse = originalAnimeId && originalAnimeId !== animeId ? originalAnimeId : animeId;
    console.log(`🔍 Fetching HiAnime info via proxy for: ${idToUse}${originalAnimeId && originalAnimeId !== animeId ? ` (original: ${originalAnimeId}, cleaned: ${animeId})` : ''}`);
    const response = await axios.get(`${PROXY_SERVER_URL}/scrape/hianime/info`, {
      params: { animeId: idToUse },
      timeout: 15000,
    });

    if (response.data?.success && response.data?.data) {
      console.log('✅ HiAnime proxy getInfo result: success');
      return response.data.data;
    }
    
    console.warn('⚠️ HiAnime proxy getInfo: response not successful', response.data);
    return null;
  } catch (error: any) {
    if (error.response) {
      console.warn(`❌ HiAnime proxy getInfo failed: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.data) {
        console.warn('Error details:', error.response.data);
      }
    } else {
      console.warn('HiAnime proxy getInfo failed:', error?.message);
    }
    return null;
  }
};

/**
 * Get anime information from HiAnime using web scraping (based on hianime-API patterns)
 */
const getHiAnimeInfoWeb = async (animeId: string, originalAnimeId?: string): Promise<any> => {
  // Validate that animeId is not purely numeric (HiAnime uses slugs, not numeric IDs)
  if (/^\d+$/.test(animeId)) {
    console.warn('HiAnime web scraping: animeId is purely numeric, skipping (HiAnime uses slugs, not numeric IDs)');
    return null;
  }

  // In web browsers, use proxy server to bypass CORS
  if (isWeb) {
    return await getHiAnimeInfoProxy(animeId, originalAnimeId);
  }

  try {
    // Try hianimez.to first (used by hianime-API), then fallback to hianime.to
    const baseUrls = [HIANIMEZ_BASE_URL, HIANIME_BASE_URL];
    
    for (const baseUrl of baseUrls) {
      try {
        // HiAnime URLs can be in different formats
        const animeUrl = animeId.startsWith('http') 
          ? animeId 
          : `${baseUrl}/watch/${animeId}`;
        
        // Build headers
        const headers: Record<string, string> = {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };
        
        const response = await axios.get(animeUrl, {
          headers,
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        
        // Title extraction (multiple selectors)
        const title = $('.anime-detail h1, .anime-title, h1, .film-name').first().text().trim() ||
                     $('meta[property="og:title"]').attr('content') || '';
        
        // Image extraction
        const image = $('.anime-poster img, .anime-cover img, .film-poster img').first().attr('src') ||
                     $('.anime-poster img, .anime-cover img, .film-poster img').first().attr('data-src') ||
                     $('meta[property="og:image"]').attr('content') || '';
        
        // Description extraction
        const description = $('.anime-description, .description, .synopsis, .film-description').text().trim() ||
                           $('meta[property="og:description"]').attr('content') || '';
        
        // Extract metadata
        const genres: string[] = [];
        $('.anime-genre a, .genre a, .film-genre a').each((_, el) => {
          const genre = $(el).text().trim();
          if (genre) genres.push(genre);
        });
        
        const status = $('.anime-status, .status, .film-status').text().trim() || '';
        const released = $('.anime-released, .released, .film-year').text().trim() || '';
        const rating = parseFloat($('.anime-rating, .rating, .film-rating').text().trim() || '0') || 0;
        const type = $('.anime-type, .type, .film-type').text().trim() || '';
        const duration = $('.anime-duration, .duration, .film-duration').text().trim() || '24 min';
        
        // Get episodes (improved selectors based on hianime-API)
        const episodes: any[] = [];
        $('.episode-item, .episode-list-item, .episode, .ep-item, .ss-list a').each((_, element) => {
          const $ep = $(element);
          const epLink = $ep.attr('href') || $ep.find('a').attr('href') || '';
          const epTitle = $ep.find('.episode-title, .title, .ep-name').text().trim() || '';
          const epNumText = $ep.find('.episode-number, .number, .ep-num').text().trim() || 
                           epLink.match(/ep-?(\d+)/i)?.[1] ||
                           epLink.match(/-(\d+)$/)?.[1] || '0';
          const epNum = parseInt(epNumText) || 0;
          
          if (epLink && epNum > 0) {
            const epId = epLink.replace(/^\//, '').replace(/\/watch\//, '').replace(/\/$/, '');
            episodes.push({
              id: epId || `${animeId}-ep-${epNum}`,
              number: epNum,
              title: epTitle || `Episode ${epNum}`,
              url: epLink.startsWith('http') ? epLink : `${baseUrl}${epLink.startsWith('/') ? '' : '/'}${epLink}`,
            });
          }
        });

        const fullImageUrl = image 
          ? (image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)
          : '';

        return {
          id: animeId,
          title: title,
          image: fullImageUrl,
          description: description,
          genres: genres,
          status: status,
          released: released,
          rating: rating,
          type: type,
          duration: duration,
          totalEpisodes: episodes.length,
          episodes: episodes,
        };
      } catch (urlError: any) {
        // Try next URL if this one fails
        continue;
      }
    }

    return null;
  } catch (error: any) {
    console.error('Error fetching HiAnime info (web scraping):', error);
    return null;
  }
};

/**
 * Get anime information from HiAnime using the scraper
 * Priority: hi-api > npm package scraper > hianime-API > web scraping
 */
export const getHiAnimeInfo = async (animeId: string): Promise<any> => {
  // Store original animeId before cleaning
  const originalAnimeId = animeId;
  
  // Clean the animeId first (remove watch/ prefix and numeric suffixes)
  animeId = cleanAnimeId(animeId);
  
  // Validate that animeId is not purely numeric (HiAnime uses slugs, not numeric IDs)
  if (/^\d+$/.test(animeId)) {
    console.warn('HiAnime getInfo: animeId is purely numeric, skipping (HiAnime uses slugs, not numeric IDs)');
    return null;
  }

  // Try hi-api first (if enabled)
  if (HI_API_ENABLED) {
    const hiApiResult = await getHiAnimeInfoHiAPI(animeId, originalAnimeId);
    if (hiApiResult) {
      return hiApiResult;
    }
  }

  // Try npm package scraper (React Native only, but also try in Node.js backend)
  if (!isWeb) {
    try {
      const instance = getScraper();
      if (instance && typeof instance.getInfo === 'function') {
        console.log('📺 Using HiAnime scraper to fetch info for:', animeId);
        const result = await instance.getInfo(animeId);
        
        if (result) {
          // The aniwatch package getInfo might not include episodes, so fetch them separately
          // Check if episodes are already included
          if (!result.episodes || (Array.isArray(result.episodes) && result.episodes.length === 0)) {
            try {
              console.log('📺 Fetching episodes separately using scraper...');
              const episodes = await instance.getEpisodes(animeId);
              
              // Handle different episode response formats
              if (Array.isArray(episodes)) {
                result.episodes = episodes;
              } else if (episodes && Array.isArray(episodes.episodes)) {
                result.episodes = episodes.episodes;
              } else if (episodes && episodes.sub && Array.isArray(episodes.sub)) {
                result.episodes = episodes.sub;
              }
              
              if (result.episodes) {
                console.log('✅ HiAnime scraper getInfo + getEpisodes result:', result.episodes.length, 'episodes');
              }
            } catch (epError: any) {
              console.warn('⚠️ Failed to fetch episodes separately:', epError?.message);
            }
          }
          
          console.log('✅ HiAnime scraper getInfo result: success');
          return result;
        }
      } else {
        console.warn('⚠️ HiAnime scraper instance or getInfo method not available');
      }
    } catch (error: any) {
      console.warn('⚠️ HiAnime scraper getInfo failed:', error?.message);
      console.warn('   Falling back to API/web scraping...');
    }
  }

  // Try hianime-API (if deployed)
  if (HIANIME_API_BASE_URL) {
    try {
      const apiResult = await getHiAnimeInfoAPI(animeId);
      if (apiResult) {
        console.log('✅ HiAnime API getInfo result: success');
        return apiResult;
      }
    } catch (error: any) {
      console.warn('⚠️ HiAnime API getInfo failed:', error?.message);
    }
  }

  // Fallback to web scraping (works in both web and React Native)
  console.log('📺 Using web scraping to fetch info for:', animeId);
  return await getHiAnimeInfoWeb(animeId, originalAnimeId);
};

/**
 * Get episodes using hi-api (aniwatch-api)
 * Note: In web environments, this will fail due to CORS, so we skip it and use proxy instead
 */
const getHiAnimeEpisodesHiAPI = async (animeId: string, originalAnimeId?: string): Promise<any[]> => {
  if (!HI_API_ENABLED) {
    return [];
  }

  // Skip direct hi-api calls in web browsers (CORS issue) - use proxy instead
  if (isWeb) {
    return [];
  }

  // Try cleaned ID first, then original ID if 404
  const animeIdsToTry = [animeId];
  if (originalAnimeId && originalAnimeId !== animeId && !/^\d+$/.test(originalAnimeId)) {
    animeIdsToTry.push(originalAnimeId);
  }

  for (const tryAnimeId of animeIdsToTry) {
    try {
      const epResponse = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/anime/${tryAnimeId}/episodes`, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });

      if (epResponse.status === 404) {
        continue;
      }

      if (epResponse.data && epResponse.data.success && epResponse.data.data) {
        const epData = epResponse.data.data;
        const rawEpisodes = epData.episodes || epData.sub || [];

        console.log(`✅ hi-api episodes: Found ${rawEpisodes.length} episodes`);

        // Format episodes - Use tryAnimeId (full ID with numeric suffix) for episode IDs
        const episodes = rawEpisodes
          .filter((ep: any) => ep.number || ep.episode)
          .map((ep: any) => {
            const epNum = ep.number || ep.episode || 0;
            return {
              id: `${tryAnimeId}?ep=${epNum}`, // Use full ID with numeric suffix
              number: epNum,
              title: ep.title || `Episode ${epNum}`,
              url: `https://hianime.to/watch/${tryAnimeId}?ep=${epNum}`,
            };
          });

        return episodes;
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404 && animeIdsToTry.length > 1) {
        continue;
      }
      console.log(`⚠️ hi-api episodes failed for ${tryAnimeId}: ${error.message}`);
    }
  }

  return [];
};

/**
 * Get episodes for an anime using the scraper
 * Priority: hi-api > npm package scraper > web scraping
 */
export const getHiAnimeEpisodes = async (animeId: string): Promise<any[]> => {
  // Store original animeId before cleaning
  const originalAnimeId = animeId;
  
  // Clean the animeId first (remove watch/ prefix and numeric suffixes)
  animeId = cleanAnimeId(animeId);
  
  // Validate that animeId is not purely numeric (HiAnime uses slugs, not numeric IDs)
  if (/^\d+$/.test(animeId)) {
    console.warn('HiAnime getEpisodes: animeId is purely numeric, skipping (HiAnime uses slugs, not numeric IDs)');
    return [];
  }

  // In web environments, use proxy server to avoid CORS
  if (isWeb) {
    try {
      // Use original ID (with numeric suffix) for better hi-api compatibility
      const idToUse = originalAnimeId && originalAnimeId !== animeId ? originalAnimeId : animeId;
      console.log(`🔍 Fetching episodes via proxy for: ${idToUse}${originalAnimeId && originalAnimeId !== animeId ? ` (original: ${originalAnimeId}, cleaned: ${animeId})` : ''}`);
      const response = await axios.get(`${PROXY_SERVER_URL}/scrape/hianime/info`, {
        params: { animeId: idToUse },
        timeout: 15000,
      });

      if (response.data && response.data.success && response.data.data) {
        const episodes = response.data.data.episodes || [];
        if (Array.isArray(episodes) && episodes.length > 0) {
          console.log('✅ Proxy episodes result:', episodes.length, 'episodes');
          return episodes;
        }
      }
    } catch (proxyError: any) {
      console.warn('⚠️ Proxy episodes failed:', proxyError?.message);
      console.warn('   Falling back to other methods...');
    }
  }

  // Try hi-api first (if enabled)
  if (HI_API_ENABLED) {
    const hiApiEpisodes = await getHiAnimeEpisodesHiAPI(animeId, originalAnimeId);
    if (hiApiEpisodes.length > 0) {
      return hiApiEpisodes;
    }
  }

  // Try npm package scraper (React Native only, but also try in Node.js backend)
  if (!isWeb) {
    try {
      const instance = getScraper();
      if (instance && typeof instance.getEpisodes === 'function') {
        console.log('📺 Using HiAnime scraper to fetch episodes for:', animeId);
        const result = await instance.getEpisodes(animeId);
        
        // The aniwatch package returns episodes in different formats
        if (Array.isArray(result)) {
          console.log('✅ HiAnime scraper getEpisodes result:', result.length, 'episodes');
          return result;
        } else if (result && Array.isArray(result.episodes)) {
          console.log('✅ HiAnime scraper getEpisodes result:', result.episodes.length, 'episodes');
          return result.episodes;
        } else if (result && result.sub && Array.isArray(result.sub)) {
          // Sometimes episodes are in sub/dub format
          console.log('✅ HiAnime scraper getEpisodes result:', result.sub.length, 'episodes (sub)');
          return result.sub;
        } else if (result && result.data && Array.isArray(result.data.episodes)) {
          // Some API wrappers return { data: { episodes: [...] } }
          console.log('✅ HiAnime scraper getEpisodes result:', result.data.episodes.length, 'episodes');
          return result.data.episodes;
        }
      } else {
        console.warn('⚠️ HiAnime scraper instance or getEpisodes method not available');
      }
    } catch (error: any) {
      console.warn('⚠️ HiAnime scraper getEpisodes failed:', error?.message);
      console.warn('   Falling back to web scraping...');
    }
  }

  // Fallback to web scraping - get info which includes episodes
  try {
    console.log('📺 Using web scraping to fetch episodes for:', animeId);
    const info = await getHiAnimeInfoWeb(animeId);
    if (info && info.episodes && Array.isArray(info.episodes)) {
      console.log('✅ HiAnime web scraping getEpisodes result:', info.episodes.length, 'episodes');
      return info.episodes;
    }
  } catch (error: any) {
    console.error('❌ Error fetching HiAnime episodes (web scraping):', error);
  }

  console.warn('❌ No episodes found for:', animeId);
  return [];
};

/**
 * Get streaming sources for an episode using web scraping (for web browsers)
 */
const getHiAnimeEpisodeSourcesWeb = async (
  episodeId: string,
  server?: string
): Promise<any[]> => {
  try {
    // Episode URL format
    const episodeUrl = episodeId.startsWith('http')
      ? episodeId
      : `${HIANIME_BASE_URL}/watch/${episodeId}`;
    
    // Build headers - don't set User-Agent in web (browsers forbid it)
    const headers: Record<string, string> = {
      'Referer': HIANIME_BASE_URL,
    };
    if (!isWeb) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }
    
    const response = await axios.get(episodeUrl, {
      headers,
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const sources: any[] = [];

    // Try to extract video sources from various embed players
    $('iframe, video source, .player iframe').each((_, element) => {
      const $el = $(element);
      const src = $el.attr('src') || $el.attr('data-src');
      if (src && (src.includes('.m3u8') || src.includes('.mp4') || src.includes('embed'))) {
        sources.push({
          url: src.startsWith('http') ? src : `${HIANIME_BASE_URL}${src}`,
          quality: 'auto',
          isM3U8: src.includes('.m3u8'),
        });
      }
    });

    // Try to extract from script tags (common pattern for video players)
    $('script').each((_, element) => {
      const scriptContent = $(element).html() || '';
      // Look for m3u8 URLs
      const m3u8Matches = scriptContent.match(/["']([^"']*\.m3u8[^"']*)["']/g);
      if (m3u8Matches) {
        m3u8Matches.forEach(match => {
          const url = match.replace(/["']/g, '');
          sources.push({
            url: url.startsWith('http') ? url : `${HIANIME_BASE_URL}${url}`,
            quality: 'auto',
            isM3U8: true,
          });
        });
      }
      // Look for mp4 URLs
      const mp4Matches = scriptContent.match(/["']([^"']*\.mp4[^"']*)["']/g);
      if (mp4Matches) {
        mp4Matches.forEach(match => {
          const url = match.replace(/["']/g, '');
          sources.push({
            url: url.startsWith('http') ? url : `${HIANIME_BASE_URL}${url}`,
            quality: 'auto',
            isM3U8: false,
          });
        });
      }
    });

    console.log(`HiAnime getEpisodeSources result (web): ${sources.length} sources`);
    return sources;
  } catch (error: any) {
    // In web, CORS errors are expected - return empty array instead of throwing
    if (isWeb && (error.code === 'ERR_NETWORK' || error.message?.includes('CORS'))) {
      console.warn('HiAnime sources fetch blocked by CORS in web browser');
      return [];
    }
    console.error('Error fetching HiAnime sources (web scraping):', error);
    return [];
  }
};

/**
 * Get episode sources using hi-api (aniwatch-api)
 * Note: In web environments, this will fail due to CORS, so we skip it and use proxy instead
 */
const getHiAnimeEpisodeSourcesHiAPI = async (
  episodeId: string,
  server: string = 'hd-1',
  category: 'sub' | 'dub' = 'sub'
): Promise<any[]> => {
  if (!HI_API_ENABLED) {
    return [];
  }

  // Skip direct hi-api calls in web browsers (CORS issue) - use proxy instead
  if (isWeb) {
    return [];
  }

  // Validate episode ID format: should be "anime-id?ep=number"
  if (!episodeId.includes('?ep=')) {
    console.warn('⚠️ hi-api episode sources: Invalid episodeId format, expected "anime-id?ep=number"');
    return [];
  }

  try {
    // First, get available servers for this episode
    let availableServers: any[] = [];
    try {
      const serversResponse = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/episode/servers`, {
        params: { animeEpisodeId: episodeId },
        timeout: 5000,
      });

      if (serversResponse.data && serversResponse.data.success && serversResponse.data.data) {
        const serversData = serversResponse.data.data;
        // Get servers for the requested category
        availableServers = serversData[category] || serversData.sub || [];
      }
    } catch (serversError: any) {
      console.log('⚠️ Could not get available servers, using default');
    }

    const serverCandidates = [server].filter(Boolean);
    availableServers.forEach((entry: any) => {
      const name = entry?.serverName || entry?.name || entry?.id || entry?.server;
      if (name && !serverCandidates.includes(name)) {
        serverCandidates.push(name);
      }
    });

    for (const serverToUse of serverCandidates) {
      try {
        // Get episode sources
        const response = await axios.get(`${HI_API_URL}${HI_API_BASE_PATH}/episode/sources`, {
          params: {
            animeEpisodeId: episodeId,
            server: serverToUse,
            category: category,
          },
          timeout: 10000,
        });

        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data;
          const sources = data.sources || [];

          if (sources.length > 0) {
            console.log(`✅ hi-api episode sources: Found ${sources.length} sources (server: ${serverToUse})`);

            // Format sources for our app
            const formattedSources = sources.map((src: any) => ({
              url: src.url || '',
              quality: src.quality || 'auto',
              isM3U8: src.isM3U8 !== false && (src.type === 'hls' || src.url?.includes('.m3u8')),
              server: serverToUse,
            }));

            return formattedSources;
          }
        }
      } catch (apiError: any) {
        console.log(`⚠️ hi-api episode sources failed for server ${serverToUse}: ${apiError?.message}`);
      }
    }

    return [];
  } catch (error: any) {
    if (error.response) {
      console.log(`⚠️ hi-api episode sources failed: ${error.response.status} - ${error.response.data?.message || error.message}`);
    } else {
      console.log(`⚠️ hi-api episode sources failed: ${error.message}`);
    }
    return [];
  }
};

/**
 * Get streaming sources for an episode using the scraper
 * Priority: hi-api > npm package scraper > hianime-API > web scraping
 * 
 * Note: aniwatch package requires server and category parameters
 * Format: getEpisodeSources(episodeId, server, category)
 * Example: getEpisodeSources('one-piece-100?ep=2142', 'hd-1', 'sub')
 */
export const getHiAnimeEpisodeSources = async (
  episodeId: string,
  server?: string,
  type: 'sub' | 'dub' = 'sub'
): Promise<any[]> => {
  // Try hi-api first (if enabled)
  if (HI_API_ENABLED) {
    const hiApiSources = await getHiAnimeEpisodeSourcesHiAPI(episodeId, server || 'hd-1', type);
    if (hiApiSources.length > 0) {
      return hiApiSources;
    }
  }

  // Try npm package scraper (React Native only, but also try in Node.js backend)
  if (!isWeb) {
    try {
      const instance = getScraper();
      if (instance && typeof instance.getEpisodeSources === 'function') {
        // aniwatch package requires server and category parameters
        // Default server: 'hd-1' (most common)
        const serverName = server || 'hd-1';
        const category = type || 'sub';
        
        console.log('🎬 Using HiAnime scraper to fetch sources for:', episodeId);
        console.log('   Preferred Server:', serverName, 'Category:', category);

        const serverCandidates: string[] = [serverName];
        try {
          const serversResult = await instance.getEpisodeServers(episodeId);
          const serversList: any[] = Array.isArray(serversResult)
            ? serversResult
            : Array.isArray(serversResult?.servers)
              ? serversResult.servers
              : Array.isArray(serversResult?.data?.servers)
                ? serversResult.data.servers
                : [
                    ...(Array.isArray(serversResult?.sub) ? serversResult.sub : []),
                    ...(Array.isArray(serversResult?.dub) ? serversResult.dub : []),
                    ...(Array.isArray(serversResult?.raw) ? serversResult.raw : []),
                  ];

          serversList.forEach((entry: any) => {
            const name = entry?.serverName || entry?.name || entry?.id || entry?.server;
            if (name && !serverCandidates.includes(name)) {
              serverCandidates.push(name);
            }
          });
        } catch (serversError: any) {
          console.log('⚠️ Could not get available servers from scraper, using default');
        }

        for (const candidate of serverCandidates) {
          try {
            console.log('   Trying server:', candidate);
            const result = await instance.getEpisodeSources(episodeId, candidate, category);

            // Result might be array or object with sources
            if (Array.isArray(result)) {
              console.log('✅ HiAnime scraper getEpisodeSources result:', result.length, 'sources');
              return result;
            } else if (result && Array.isArray(result.sources)) {
              console.log('✅ HiAnime scraper getEpisodeSources result:', result.sources.length, 'sources');
              return result.sources;
            } else if (result && result.data && Array.isArray(result.data.sources)) {
              // Some API wrappers return { data: { sources: [...] } }
              console.log('✅ HiAnime scraper getEpisodeSources result:', result.data.sources.length, 'sources');
              return result.data.sources;
            } else if (result && result.url) {
              // Sometimes returns single URL object
              console.log('✅ HiAnime scraper getEpisodeSources result: 1 source');
              return [result];
            }
          } catch (candidateError: any) {
            console.warn(`⚠️ HiAnime scraper getEpisodeSources failed for ${candidate}:`, candidateError?.message);
          }
        }
      } else {
        console.warn('⚠️ HiAnime scraper instance or getEpisodeSources method not available');
      }
    } catch (error: any) {
      console.warn('⚠️ HiAnime scraper getEpisodeSources failed:', error?.message);
      console.warn('   Falling back to API/web scraping...');
    }
  }

  // Try hianime-API (if deployed)
  if (HIANIME_API_BASE_URL) {
    try {
      const apiStream = await getHiAnimeStreamAPI(episodeId, server, type);
      if (apiStream && apiStream.sources) {
        const sources = Array.isArray(apiStream.sources) 
          ? apiStream.sources 
          : [];
        if (sources.length > 0) {
          console.log('✅ HiAnime API getEpisodeSources result:', sources.length, 'sources');
          return sources;
        }
      }
    } catch (error: any) {
      console.warn('⚠️ HiAnime API getEpisodeSources failed:', error?.message);
    }
  }

  // In web environments, use proxy server to avoid CORS
  if (isWeb) {
    try {
      console.log('🔍 Fetching episode sources via proxy for:', episodeId);
      const response = await axios.get(`${PROXY_SERVER_URL}/scrape/hianime/episode-sources`, {
        params: {
          episodeId,
          server: server || 'hd-1',
          category: type || 'sub',
        },
        timeout: 15000,
      });

      if (response.data && response.data.success && response.data.data) {
        const data = response.data.data;
        // Return the full response object (sources, headers, tracks, intro, outro)
        // This allows the streaming service to extract all the data
        if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
          console.log('✅ Proxy episode sources result:', data.sources.length, 'sources');
          // Return the full data object, not just sources
          return data;
        } else if (Array.isArray(data) && data.length > 0) {
          // Fallback: if data is directly an array of sources
          console.log('✅ Proxy episode sources result:', data.length, 'sources');
          return data;
        }
      }
    } catch (proxyError: any) {
      console.warn('⚠️ Proxy episode sources failed:', proxyError?.message);
      console.warn('   Falling back to web scraping...');
    }
  }

  // Fallback to web scraping (works in both web and React Native)
  console.log('📺 Using web scraping to fetch sources for:', episodeId);
  return await getHiAnimeEpisodeSourcesWeb(episodeId, server);
};

/**
 * Get episode servers using hianime-API (if deployed)
 */
const getHiAnimeEpisodeServersAPI = async (episodeId: string): Promise<any[]> => {
  if (!HIANIME_API_BASE_URL) {
    return [];
  }

  try {
    const response = await axios.get(`${HIANIME_API_BASE_URL}/servers`, {
      params: { id: episodeId },
      timeout: 10000,
    });

    if (response.data?.success && response.data?.data) {
      const servers = Array.isArray(response.data.data) 
        ? response.data.data 
        : response.data.data.servers || [];
      console.log('HiAnime API getEpisodeServers result:', servers.length, 'servers');
      return servers;
    }
    return [];
  } catch (error: any) {
    console.warn('HiAnime API getEpisodeServers failed:', error?.message);
    return [];
  }
};

/**
 * Get episode servers using backend proxy (for web browsers)
 */
const getHiAnimeEpisodeServersProxy = async (episodeId: string): Promise<any[]> => {
  try {
    const response = await axios.get(`${PROXY_SERVER_URL}/scrape/hianime/episode-servers`, {
      params: { episodeId },
      timeout: 15000,
    });

    if (response.data?.success && response.data?.data) {
      const { servers, sources } = response.data.data;
      // Return servers if available, otherwise return sources as servers
      if (servers && servers.length > 0) {
        console.log('HiAnime proxy getEpisodeServers result:', servers.length, 'servers');
        return servers;
      }
      if (sources && sources.length > 0) {
        console.log('HiAnime proxy getEpisodeServers result:', sources.length, 'sources');
        return sources.map((src: any) => ({
          name: src.quality || 'Default',
          id: 'default',
          url: src.url,
        }));
      }
    }
    return [];
  } catch (error: any) {
    console.warn('HiAnime proxy getEpisodeServers failed:', error?.message);
    return [];
  }
};

/**
 * Get episode servers (different video hosts)
 * Priority: hianime-API > npm package > proxy (web) > fallback to sources
 */
export const getHiAnimeEpisodeServers = async (episodeId: string): Promise<any[]> => {
  // Try hianime-API first (if deployed)
  if (HIANIME_API_BASE_URL) {
    const apiServers = await getHiAnimeEpisodeServersAPI(episodeId);
    if (apiServers.length > 0) {
      return apiServers;
    }
  }

  // In web browsers, use proxy server
  if (isWeb) {
    return await getHiAnimeEpisodeServersProxy(episodeId);
  }

  // Try npm package scraper (React Native only, but also try in Node.js backend)
  if (!isWeb) {
    try {
      const instance = getScraper();
      if (instance && typeof instance.getEpisodeServers === 'function') {
        console.log('🎬 Using HiAnime scraper to fetch servers for:', episodeId);
        const result = await instance.getEpisodeServers(episodeId);
        
        if (result) {
          // Handle different response formats
          if (Array.isArray(result)) {
            console.log('✅ HiAnime scraper getEpisodeServers result:', result.length, 'servers');
            return result;
          } else if (result && Array.isArray(result.servers)) {
            console.log('✅ HiAnime scraper getEpisodeServers result:', result.servers.length, 'servers');
            return result.servers;
          } else if (result && result.data && Array.isArray(result.data.servers)) {
            console.log('✅ HiAnime scraper getEpisodeServers result:', result.data.servers.length, 'servers');
            return result.data.servers;
          } else if (result && (result.sub || result.dub || result.raw)) {
            // Sometimes servers are organized by category
            const servers: any[] = [];
            if (result.sub && Array.isArray(result.sub)) servers.push(...result.sub);
            if (result.dub && Array.isArray(result.dub)) servers.push(...result.dub);
            if (result.raw && Array.isArray(result.raw)) servers.push(...result.raw);
            console.log('✅ HiAnime scraper getEpisodeServers result:', servers.length, 'servers');
            return servers;
          }
        }
      } else {
        console.warn('⚠️ HiAnime scraper instance or getEpisodeServers method not available');
      }
    } catch (error: any) {
      console.warn('⚠️ HiAnime scraper getEpisodeServers failed:', error?.message);
    }
  }
  
  // If no servers method, try to get sources directly
  return await getHiAnimeEpisodeSources(episodeId);
};

/**
 * Get streaming links using hianime-API (if deployed)
 */
const getHiAnimeStreamAPI = async (
  episodeId: string,
  server?: string,
  type: 'sub' | 'dub' = 'sub'
): Promise<any> => {
  if (!HIANIME_API_BASE_URL) {
    return null;
  }

  try {
    const response = await axios.get(`${HIANIME_API_BASE_URL}/stream`, {
      params: { 
        id: episodeId,
        server: server || 'default',
        type 
      },
      timeout: 10000,
    });

    if (response.data?.success && response.data?.data) {
      console.log('HiAnime API stream result: success');
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.warn('HiAnime API stream failed:', error?.message);
    return null;
  }
};

/**
 * Get home page data (trending, spotlight, top airing, etc.)
 * Based on hianime-API /home endpoint
 */
export const getHiAnimeHome = async (): Promise<any> => {
  // Try hianime-API first (if deployed)
  if (HIANIME_API_BASE_URL) {
    try {
      const response = await axios.get(`${HIANIME_API_BASE_URL}/home`, {
        timeout: 10000,
      });

      if (response.data?.success && response.data?.data) {
        console.log('HiAnime API home result: success');
        return response.data.data;
      }
    } catch (error: any) {
      console.warn('HiAnime API home failed:', error?.message);
    }
  }

  // Fallback to web scraping
  try {
    const baseUrls = [HIANIMEZ_BASE_URL, HIANIME_BASE_URL];
    
    for (const baseUrl of baseUrls) {
      try {
        const headers: Record<string, string> = {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        };
        if (!isWeb) {
          headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        }
        
        const response = await axios.get(baseUrl, {
          headers,
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        
        // Extract trending, spotlight, top airing, etc.
        const spotlight: any[] = [];
        const trending: any[] = [];
        const topAiring: any[] = [];
        const latestEpisodes: any[] = [];

        // Extract spotlight anime
        $('.slider-item, .spotlight-item, .hero-slide').each((_, element) => {
          const $item = $(element);
          const link = $item.find('a').attr('href');
          const title = $item.find('h2, h3, .title').text().trim();
          const image = $item.find('img').attr('src') || $item.find('img').attr('data-src') || '';
          
          if (link && title) {
            const animeId = cleanAnimeId(link);
            spotlight.push({
              id: animeId,
              title,
              image: image.startsWith('http') ? image : `${baseUrl}${image}`,
              url: link.startsWith('http') ? link : `${baseUrl}${link}`,
            });
          }
        });

        // Extract trending/top airing (common selectors)
        $('.trending-item, .top-airing-item, .popular-item').each((_, element) => {
          const $item = $(element);
          const link = $item.find('a').attr('href');
          const title = $item.find('.title, h3').text().trim();
          const image = $item.find('img').attr('src') || $item.find('img').attr('data-src') || '';
          
          if (link && title) {
            const animeId = cleanAnimeId(link);
            trending.push({
              id: animeId,
              title,
              image: image.startsWith('http') ? image : `${baseUrl}${image}`,
              url: link.startsWith('http') ? link : `${baseUrl}${link}`,
            });
          }
        });

        return {
          spotlight,
          trending,
          topAiring,
          latestEpisodes,
        };
      } catch (urlError: any) {
        continue;
      }
    }
  } catch (error: any) {
    console.error('Error fetching HiAnime home (web scraping):', error);
  }

  return null;
};

/**
 * Get anime by genre
 * Based on hianime-API /genre/{genre} endpoint
 */
export const getHiAnimeByGenre = async (genre: string, page: number = 1): Promise<any[]> => {
  // Try hianime-API first (if deployed)
  if (HIANIME_API_BASE_URL) {
    try {
      const response = await axios.get(`${HIANIME_API_BASE_URL}/genre/${genre}`, {
        params: { page },
        timeout: 10000,
      });

      if (response.data?.success && response.data?.data) {
        const results = Array.isArray(response.data.data) 
          ? response.data.data 
          : response.data.data.results || [];
        console.log(`HiAnime API genre "${genre}" result: ${results.length} items`);
        return results;
      }
    } catch (error: any) {
      console.warn('HiAnime API genre failed:', error?.message);
    }
  }

  // Fallback to web scraping
  try {
    const baseUrls = [HIANIMEZ_BASE_URL, HIANIME_BASE_URL];
    
    for (const baseUrl of baseUrls) {
      try {
        const genreUrl = `${baseUrl}/genre/${genre}${page > 1 ? `?page=${page}` : ''}`;
        const headers: Record<string, string> = {};
        if (!isWeb) {
          headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        }
        
        const response = await axios.get(genreUrl, {
          headers,
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        const results: any[] = [];

        $('.film_list-wrap .flw-item, .item-inner, .anime-card').each((_, element) => {
          const $item = $(element);
          const link = $item.find('a').first().attr('href');
          const title = $item.find('.film-name, .anime-title, h3').first().text().trim();
          const image = $item.find('img').first().attr('src') || $item.find('img').first().attr('data-src') || '';

          if (link && title) {
            const animeId = cleanAnimeId(link);
            results.push({
              id: animeId,
              title,
              image: image.startsWith('http') ? image : `${baseUrl}${image}`,
              url: link.startsWith('http') ? link : `${baseUrl}${link}`,
            });
          }
        });

        if (results.length > 0) {
          console.log(`HiAnime genre "${genre}" result: ${results.length} items`);
          return results;
        }
      } catch (urlError: any) {
        continue;
      }
    }
  } catch (error: any) {
    console.error(`Error fetching HiAnime genre "${genre}":`, error);
  }

  return [];
};

/**
 * Convert HiAnime anime to app Anime format
 */
export const convertHiAnimeToAnime = (hianimeData: any): Anime => {
  return {
    id: hianimeData.id || hianimeData.animeId || '',
    title: hianimeData.title || hianimeData.name || '',
    coverImage: hianimeData.image || hianimeData.coverImage || hianimeData.img || '',
    bannerImage: hianimeData.bannerImage || hianimeData.image || '',
    description: hianimeData.description || hianimeData.synopsis || '',
    episodes: hianimeData.totalEpisodes || hianimeData.episodes || 0,
    rating: parseFloat(hianimeData.rating || hianimeData.score || '0') || 0,
    year: parseInt(hianimeData.released || hianimeData.year || '0') || 0,
    genres: hianimeData.genres || hianimeData.genre || [],
    status: (hianimeData.status === 'Completed' || hianimeData.status === 'completed') 
      ? 'Completed' 
      : 'Ongoing',
    duration: hianimeData.duration || '24 min',
    studio: hianimeData.studio || '',
  };
};

/**
 * Convert HiAnime episode to app Episode format
 */
export const convertHiAnimeToEpisode = (hianimeEpisode: any, animeId: string): Episode => {
  // Handle different episode data formats
  const episodeId = hianimeEpisode.id || 
                     hianimeEpisode.episodeId || 
                     hianimeEpisode.episode_id ||
                     `${animeId}-ep-${hianimeEpisode.number || hianimeEpisode.episodeNumber || ''}`;
  
  const episodeNumber = hianimeEpisode.number || 
                        hianimeEpisode.episodeNumber || 
                        hianimeEpisode.episode_number ||
                        parseInt(episodeId.split('-ep-')[1] || '0') || 0;
  
  const title = hianimeEpisode.title || 
                hianimeEpisode.name || 
                `Episode ${episodeNumber}`;
  
  const videoUrl = hianimeEpisode.url || 
                   hianimeEpisode.episodeUrl || 
                   hianimeEpisode.episode_url ||
                   hianimeEpisode.link || '';

  return {
    id: episodeId,
    animeId: animeId,
    episodeNumber: episodeNumber,
    title: title,
    thumbnail: hianimeEpisode.image || hianimeEpisode.thumbnail || hianimeEpisode.img || '',
    duration: hianimeEpisode.duration || '24 min',
    videoUrl: videoUrl,
  };
};
