/**
 * Web Scraping Service for Anime Streaming
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 * 
 * This code is provided for educational purposes to understand web scraping concepts.
 * Scraping copyrighted content without permission may violate terms of service and laws.
 * Use responsibly and only for learning purposes.
 * 
 * For production use, always:
 * 1. Get proper permissions/licenses
 * 2. Use official APIs
 * 3. Respect robots.txt
 * 4. Follow rate limiting
 */

export interface ScrapedEpisode {
  id: string;
  number: number;
  title: string;
  url: string;
}

export interface ScrapedAnimeInfo {
  id: string;
  title: string;
  image?: string;
  description?: string;
  episodes: ScrapedEpisode[];
  totalEpisodes: number;
}

export interface ScrapedStreamSource {
  url: string;
  quality: string;
  type: 'mp4' | 'm3u8' | 'dash';
  headers?: Record<string, string>;
}

import { fetchWithCache } from './proxyService';

const GOGOANIME_BASE_URL = 'https://anitaku.pe'; // Updated GoGoAnime domain

/**
 * Scrape search results from Gogoanime
 */
export const scrapeGogoanimeSearch = async (query: string): Promise<any[]> => {
  try {
    console.log('Searching GoGoAnime for:', query);
    
    const searchUrl = `${GOGOANIME_BASE_URL}/search.html?keyword=${encodeURIComponent(query)}`;
    console.log('GoGoAnime search URL:', searchUrl);
    
    const html = await fetchWithCache(searchUrl);
    
    console.log('GoGoAnime HTML length:', html.length);
    console.log('GoGoAnime HTML preview:', html.substring(0, 500));
    
    // Parse HTML to extract anime list
    const results = parseSearchResults(html);
    console.log(`Found ${results.length} results from GoGoAnime`);
    
    return results;
  } catch (error) {
    console.error('GoGoAnime scraping error:', error);
    return [];
  }
};

/**
 * Scrape anime information and episodes
 */
export const scrapeAnimeInfo = async (animeId: string): Promise<ScrapedAnimeInfo | null> => {
  try {
    console.log('Fetching GoGoAnime info for:', animeId);
    
    const categoryUrl = `${GOGOANIME_BASE_URL}/category/${animeId}`;
    const html = await fetchWithCache(categoryUrl);
    
    console.log('GoGoAnime category HTML length:', html.length);
    
    return parseAnimeInfo(html, animeId);
  } catch (error) {
    console.error('Error scraping anime info:', error);
    return null;
  }
};

/**
 * Scrape video sources from episode page
 */
export const scrapeVideoSources = async (episodeId: string): Promise<ScrapedStreamSource[]> => {
  try {
    console.log('Fetching video sources for:', episodeId);
    
    const episodeUrl = `${GOGOANIME_BASE_URL}/${episodeId}`;
    const html = await fetchWithCache(episodeUrl);
    
    console.log('Episode page HTML length:', html.length);
    
    return parseVideoSources(html);
  } catch (error) {
    console.error('Error scraping video sources:', error);
    return [];
  }
};

/**
 * Parse search results from HTML
 */
const parseSearchResults = (html: string): any[] => {
  const results: any[] = [];
  
  try {
    console.log('Parsing GoGoAnime search results...');
    console.log('HTML sample:', html.substring(0, 1000));
    
    // Try multiple patterns for GoGoAnime search results
    // Pattern 1: New GoGoAnime structure
    const pattern1 = /<div class="img">.*?<a href="\/category\/(.*?)".*?title="(.*?)".*?<img.*?src="(.*?)"/gs;
    
    // Pattern 2: Alternative structure
    const pattern2 = /<li>.*?<a href="\/category\/(.*?)".*?<img.*?src="(.*?)".*?title="(.*?)"/gs;
    
    // Pattern 3: Simple link pattern
    const pattern3 = /<a href="\/category\/(.*?)"[^>]*>(.*?)<\/a>/gs;
    
    let match;
    
    // Try pattern 1
    while ((match = pattern1.exec(html)) !== null) {
      const id = match[1];
      const title = cleanText(match[2]);
      const image = match[3];
      
      if (id && title) {
        console.log(`Pattern 1 found: ${title} (${id})`);
        results.push({
          id,
          title,
          image,
          url: `${GOGOANIME_BASE_URL}/category/${id}`,
        });
      }
    }
    
    // If pattern 1 didn't work, try pattern 2
    if (results.length === 0) {
      console.log('Pattern 1 failed, trying pattern 2...');
      while ((match = pattern2.exec(html)) !== null) {
        const id = match[1];
        const image = match[2];
        const title = cleanText(match[3]);
        
        if (id && title) {
          console.log(`Pattern 2 found: ${title} (${id})`);
          results.push({
            id,
            title,
            image,
            url: `${GOGOANIME_BASE_URL}/category/${id}`,
          });
        }
      }
    }
    
    // If still no results, try simple pattern
    if (results.length === 0) {
      console.log('Pattern 2 failed, trying pattern 3...');
      while ((match = pattern3.exec(html)) !== null) {
        const id = match[1];
        const title = cleanText(match[2]);
        
        if (id && title && !title.includes('<') && id.length > 0) {
          console.log(`Pattern 3 found: ${title} (${id})`);
          results.push({
            id,
            title,
            image: undefined,
            url: `${GOGOANIME_BASE_URL}/category/${id}`,
          });
        }
      }
    }
    
    console.log(`Parsed ${results.length} GoGoAnime results`);
    
  } catch (error) {
    console.error('Error parsing search results:', error);
  }
  
  return results;
};

/**
 * Parse anime information from HTML
 */
const parseAnimeInfo = (html: string, animeId: string): ScrapedAnimeInfo | null => {
  try {
    console.log('Parsing GoGoAnime anime info for:', animeId);
    console.log('HTML length:', html.length);
    
    // Extract title
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/) || 
                      html.match(/<h2[^>]*class="title"[^>]*>(.*?)<\/h2>/);
    const title = titleMatch ? cleanText(titleMatch[1]) : animeId.replace(/-/g, ' ');
    console.log('Extracted title:', title);
    
    // Extract image
    const imageMatch = html.match(/<div class="anime_info_body_bg">.*?<img src="(.*?)"/s) ||
                      html.match(/<img[^>]*class="[^"]*anime[^"]*"[^>]*src="(.*?)"/);
    const image = imageMatch ? imageMatch[1] : undefined;
    console.log('Extracted image:', image ? 'Yes' : 'No');
    
    // Extract description
    const descMatch = html.match(/<p class="type">.*?Plot Summary:<\/span>(.*?)<\/p>/s) ||
                     html.match(/<div[^>]*class="description"[^>]*>(.*?)<\/div>/s);
    const description = descMatch ? cleanText(descMatch[1]) : undefined;
    
    // Extract episodes
    const episodes = parseEpisodesList(html, animeId);
    console.log('Extracted episodes:', episodes.length);
    
    if (episodes.length === 0) {
      console.warn('No episodes found, generating placeholder episode list');
      // Generate placeholder episodes (1-12 by default)
      for (let i = 1; i <= 12; i++) {
        episodes.push({
          id: `${animeId}-episode-${i}`,
          number: i,
          title: `Episode ${i}`,
          url: `${GOGOANIME_BASE_URL}/${animeId}-episode-${i}`,
        });
      }
    }
    
    return {
      id: animeId,
      title,
      image,
      description,
      episodes,
      totalEpisodes: episodes.length,
    };
  } catch (error) {
    console.error('Error parsing anime info:', error);
    return null;
  }
};

/**
 * Parse episodes list from HTML
 */
const parseEpisodesList = (html: string, animeId: string): ScrapedEpisode[] => {
  const episodes: ScrapedEpisode[] = [];
  
  try {
    console.log('Parsing episodes list for:', animeId);
    
    // Extract episode range (method 1)
    const epStartMatch = html.match(/ep_start\s*=\s*["'](\d+)["']/);
    const epEndMatch = html.match(/ep_end\s*=\s*["'](\d+)["']/);
    
    if (epStartMatch && epEndMatch) {
      const start = parseInt(epStartMatch[1]);
      const end = parseInt(epEndMatch[1]);
      console.log(`Found episode range: ${start} to ${end}`);
      
      for (let i = start; i <= end; i++) {
        episodes.push({
          id: `${animeId}-episode-${i}`,
          number: i,
          title: `Episode ${i}`,
          url: `/${animeId}-episode-${i}`,
        });
      }
    }
  } catch (error) {
    console.error('Error parsing episodes:', error);
  }
  
  return episodes;
};

/**
 * Parse video sources from episode page
 */
const parseVideoSources = (html: string): ScrapedStreamSource[] => {
  const sources: ScrapedStreamSource[] = [];
  
  try {
    console.log('Parsing GoGoAnime video sources...');
    console.log('HTML length:', html.length);
    console.log('HTML preview:', html.substring(0, 500));
    
    // Extract download links (they often contain direct video URLs)
    const downloadPattern = /<a[^>]*href="([^"]+)"[^>]*download[^>]*>.*?(\d+p)?/gi;
    let match;
    let downloadCount = 0;
    
    while ((match = downloadPattern.exec(html)) !== null) {
      const url = match[1];
      const quality = match[2] || 
                     (match[0].includes('1080') ? '1080p' : 
                      match[0].includes('720') ? '720p' : 
                      match[0].includes('480') ? '480p' : 'default');
      
      console.log(`Found download link: ${quality} - ${url.substring(0, 50)}...`);
      downloadCount++;
      
      sources.push({
        url: url,
        quality: quality,
        type: url.includes('.m3u8') ? 'm3u8' : 'mp4',
      });
    }
    
    console.log(`Found ${downloadCount} download links`);
    
    // Extract iframe sources
    const iframePattern = /<iframe[^>]*src="([^"]+)"/gi;
    let iframeCount = 0;
    
    while ((match = iframePattern.exec(html)) !== null) {
      const iframeUrl = match[1];
      console.log(`Found iframe source: ${iframeUrl}`);
      iframeCount++;
      
      // Add iframe URL as a source (will need further processing)
      sources.push({
        url: iframeUrl,
        quality: 'Streaming',
        type: 'm3u8',
        headers: {
          Referer: GOGOANIME_BASE_URL,
        },
      });
    }
    
    console.log(`Found ${iframeCount} iframe sources`);
    
    // If no sources found, add a placeholder to indicate the page was reached
    if (sources.length === 0) {
      console.warn('No video sources extracted from GoGoAnime page');
      console.log('Full HTML for debugging:', html);
    }
    
  } catch (error) {
    console.error('Error parsing video sources:', error);
  }
  
  return sources;
};

/**
 * Clean HTML text (remove tags and decode entities)
 */
const cleanText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
};

/**
 * Extract M3U8 URL from embed page
 */
export const extractM3U8FromEmbed = async (embedUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(embedUrl);
    const html = await response.text();
    
    // Look for m3u8 URLs in the embed page
    const m3u8Pattern = /(https?:\/\/[^"']*\.m3u8[^"']*)/;
    const match = html.match(m3u8Pattern);
    
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting M3U8:', error);
    return null;
  }
};

/**
 * Advanced: Extract video URL from GogoPlay server
 */
export const extractGogoPlaySource = async (serverUrl: string): Promise<ScrapedStreamSource[]> => {
  const sources: ScrapedStreamSource[] = [];
  
  try {
    const response = await fetch(serverUrl);
    const html = await response.text();
    
    // Extract encryption keys and encrypted data
    const encryptedDataMatch = html.match(/data-value="(.*?)"/);
    const cryptoKeyMatch = html.match(/crypto-js[^"]*"(.*?)"/);
    
    if (encryptedDataMatch && cryptoKeyMatch) {
      // Note: You'll need to implement decryption logic
      // GogoAnime typically uses AES encryption
      console.log('Found encrypted data - decryption needed');
    }
    
    // Look for direct m3u8 links
    const m3u8Match = html.match(/(https?:\/\/[^"']*\.m3u8[^"']*)/);
    if (m3u8Match) {
      sources.push({
        url: m3u8Match[1],
        quality: 'auto',
        type: 'm3u8',
        headers: {
          'Referer': 'https://gogoplay.io/',
        },
      });
    }
  } catch (error) {
    console.error('Error extracting GogoPlay source:', error);
  }
  
  return sources;
};

/**
 * Fallback: Try multiple scraping strategies
 */
export const scrapeWithFallback = async (episodeId: string): Promise<ScrapedStreamSource[]> => {
  const strategies = [
    () => scrapeVideoSources(episodeId),
    () => scrapeAlternativeSource(episodeId),
    () => scrapeBackupSource(episodeId),
  ];
  
  for (const strategy of strategies) {
    try {
      const sources = await strategy();
      if (sources.length > 0) {
        return sources;
      }
    } catch (error) {
      console.log('Strategy failed, trying next...');
    }
  }
  
  return [];
};

/**
 * Alternative scraping method
 */
const scrapeAlternativeSource = async (episodeId: string): Promise<ScrapedStreamSource[]> => {
  // Implement alternative scraping logic
  // Could try different anime streaming sites
  return [];
};

/**
 * Backup scraping method
 */
const scrapeBackupSource = async (episodeId: string): Promise<ScrapedStreamSource[]> => {
  // Implement backup scraping logic
  return [];
};

/**
 * Rate limiting helper
 */
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private delayMs = 1000; // 1 second between requests
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        await fn();
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }
    
    this.processing = false;
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Utility: Check if URL is valid and accessible
 */
export const validateStreamUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

