/**
 * Animeflix Scraper
 * 
 * Web scraping service for https://ww2.animeflix.ltd/
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 * This is for educational purposes only.
 * For production, use official APIs or get proper licensing.
 */

import { fetchWithCache } from './proxyService';

const ANIMEFLIX_BASE_URL = 'https://ww2.animeflix.ltd';

export interface AnimeflixAnime {
  id: string;
  title: string;
  url: string;
  image?: string;
  description?: string;
  type?: string;
}

export interface AnimeflixEpisode {
  id: string;
  number: number;
  title: string;
  url: string;
}

export interface AnimeflixStreamSource {
  url: string;
  quality: string;
  type: string;
  headers?: Record<string, string>;
}

/**
 * Search anime on Animeflix
 */
export const searchAnimeflixAnime = async (query: string): Promise<AnimeflixAnime[]> => {
  try {
    console.log('Searching Animeflix for:', query);
    
    // Animeflix search endpoint (you'll need to inspect their site for actual endpoint)
    const searchUrl = `${ANIMEFLIX_BASE_URL}/search?q=${encodeURIComponent(query)}`;
    
    const html = await fetchWithCache(searchUrl);
    
    // Parse HTML to extract anime results
    const animes = parseAnimeflixSearch(html);
    
    console.log(`Found ${animes.length} results on Animeflix`);
    return animes;
  } catch (error) {
    console.error('Error searching Animeflix:', error);
    return [];
  }
};

/**
 * Parse Animeflix search results
 */
const parseAnimeflixSearch = (html: string): AnimeflixAnime[] => {
  const animes: AnimeflixAnime[] = [];
  
  try {
    // Extract anime cards from HTML
    // This regex looks for common anime card patterns
    const cardRegex = /<div[^>]*class="[^"]*card[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
    const cards = html.match(cardRegex) || [];
    
    cards.forEach((card, index) => {
      try {
        // Extract title
        const titleMatch = card.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/) ||
                          card.match(/title="([^"]+)"/) ||
                          card.match(/alt="([^"]+)"/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        // Extract URL
        const urlMatch = card.match(/href="([^"]+)"/);
        const url = urlMatch ? urlMatch[1] : '';
        
        // Extract image
        const imgMatch = card.match(/src="([^"]+)"/) ||
                        card.match(/data-src="([^"]+)"/);
        const image = imgMatch ? imgMatch[1] : '';
        
        // Extract ID from URL
        const idMatch = url.match(/\/anime\/([^\/\?]+)/);
        const id = idMatch ? idMatch[1] : `animeflix-${index}`;
        
        if (title && url) {
          animes.push({
            id,
            title: cleanText(title),
            url: url.startsWith('http') ? url : `${ANIMEFLIX_BASE_URL}${url}`,
            image: image.startsWith('http') ? image : (image ? `${ANIMEFLIX_BASE_URL}${image}` : undefined),
          });
        }
      } catch (err) {
        console.error('Error parsing anime card:', err);
      }
    });
  } catch (error) {
    console.error('Error parsing search results:', error);
  }
  
  return animes;
};

/**
 * Get anime details and episodes
 */
export const getAnimeflixAnimeInfo = async (animeId: string): Promise<{
  anime: AnimeflixAnime;
  episodes: AnimeflixEpisode[];
} | null> => {
  try {
    console.log('Fetching Animeflix anime info for:', animeId);
    
    const animeUrl = `${ANIMEFLIX_BASE_URL}/anime/${animeId}`;
    const html = await fetchWithCache(animeUrl);
    
    // Parse anime details
    const anime = parseAnimeflixAnimeDetails(html, animeId);
    
    // Parse episodes
    const episodes = parseAnimeflixEpisodes(html, animeId);
    
    console.log(`Found ${episodes.length} episodes`);
    
    return { anime, episodes };
  } catch (error) {
    console.error('Error fetching anime info:', error);
    return null;
  }
};

/**
 * Parse anime details
 */
const parseAnimeflixAnimeDetails = (html: string, animeId: string): AnimeflixAnime => {
  try {
    // Extract title
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
                      html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - Animeflix', '').trim() : animeId;
    
    // Extract description
    const descMatch = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/) ||
                     html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Extract image
    const imgMatch = html.match(/<img[^>]*class="[^"]*poster[^"]*"[^>]*src="([^"]+)"/) ||
                    html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    const image = imgMatch ? imgMatch[1] : '';
    
    return {
      id: animeId,
      title: cleanText(title),
      url: `${ANIMEFLIX_BASE_URL}/anime/${animeId}`,
      image: image.startsWith('http') ? image : (image ? `${ANIMEFLIX_BASE_URL}${image}` : undefined),
      description: cleanText(description),
    };
  } catch (error) {
    console.error('Error parsing anime details:', error);
    return {
      id: animeId,
      title: animeId,
      url: `${ANIMEFLIX_BASE_URL}/anime/${animeId}`,
    };
  }
};

/**
 * Parse episode list
 */
const parseAnimeflixEpisodes = (html: string, animeId: string): AnimeflixEpisode[] => {
  const episodes: AnimeflixEpisode[] = [];
  
  try {
    // Look for episode links
    const episodeRegex = /<a[^>]*href="([^"]*\/episode\/[^"]+)"[^>]*>[\s\S]*?Episode\s*(\d+)[\s\S]*?<\/a>/gi;
    let match;
    
    while ((match = episodeRegex.exec(html)) !== null) {
      const url = match[1];
      const number = parseInt(match[2]);
      
      episodes.push({
        id: `${animeId}-episode-${number}`,
        number,
        title: `Episode ${number}`,
        url: url.startsWith('http') ? url : `${ANIMEFLIX_BASE_URL}${url}`,
      });
    }
    
    // Alternative: Look for numbered links
    if (episodes.length === 0) {
      const altRegex = /<a[^>]*href="([^"]+)"[^>]*>(\d+)<\/a>/gi;
      
      while ((match = altRegex.exec(html)) !== null) {
        const url = match[1];
        const number = parseInt(match[2]);
        
        if (url.includes('episode') || url.includes('watch')) {
          episodes.push({
            id: `${animeId}-episode-${number}`,
            number,
            title: `Episode ${number}`,
            url: url.startsWith('http') ? url : `${ANIMEFLIX_BASE_URL}${url}`,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error parsing episodes:', error);
  }
  
  // Sort by episode number
  episodes.sort((a, b) => a.number - b.number);
  
  return episodes;
};

/**
 * Get streaming sources for episode
 */
export const getAnimeflixStreamSources = async (
  episodeUrl: string
): Promise<AnimeflixStreamSource[]> => {
  try {
    console.log('Fetching stream sources from:', episodeUrl);
    
    const html = await fetchWithCache(episodeUrl);
    
    // Parse video sources
    const sources = parseAnimeflixSources(html);
    
    console.log(`Found ${sources.length} streaming sources`);
    return sources;
  } catch (error) {
    console.error('Error fetching stream sources:', error);
    return [];
  }
};

/**
 * Parse video sources from episode page
 */
const parseAnimeflixSources = (html: string): AnimeflixStreamSource[] => {
  const sources: AnimeflixStreamSource[] = [];
  
  try {
    // Look for video sources in various formats
    
    // 1. Look for direct video URLs
    const videoRegex = /(https?:\/\/[^\s"']+\.(?:mp4|m3u8|mpd))/gi;
    let match;
    
    while ((match = videoRegex.exec(html)) !== null) {
      const url = match[1];
      const isM3U8 = url.includes('.m3u8');
      const isMPD = url.includes('.mpd');
      
      sources.push({
        url,
        quality: isM3U8 ? 'HLS' : (isMPD ? 'DASH' : 'MP4'),
        type: isM3U8 ? 'hls' : (isMPD ? 'dash' : 'mp4'),
      });
    }
    
    // 2. Look for iframe embeds
    const iframeRegex = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
    
    while ((match = iframeRegex.exec(html)) !== null) {
      const iframeUrl = match[1];
      
      if (iframeUrl.includes('embed') || iframeUrl.includes('player')) {
        sources.push({
          url: iframeUrl.startsWith('http') ? iframeUrl : `${ANIMEFLIX_BASE_URL}${iframeUrl}`,
          quality: 'Embed',
          type: 'embed',
        });
      }
    }
    
    // 3. Look for JavaScript video sources
    const jsSourceRegex = /["']file["']\s*:\s*["']([^"']+)["']/gi;
    
    while ((match = jsSourceRegex.exec(html)) !== null) {
      const url = match[1];
      
      if (url.startsWith('http') && (url.includes('.mp4') || url.includes('.m3u8'))) {
        sources.push({
          url,
          quality: url.includes('.m3u8') ? 'HLS' : 'MP4',
          type: url.includes('.m3u8') ? 'hls' : 'mp4',
        });
      }
    }
    
    // 4. Look for source tags
    const sourceRegex = /<source[^>]*src="([^"]+)"[^>]*>/gi;
    
    while ((match = sourceRegex.exec(html)) !== null) {
      const url = match[1];
      
      sources.push({
        url: url.startsWith('http') ? url : `${ANIMEFLIX_BASE_URL}${url}`,
        quality: url.includes('.m3u8') ? 'HLS' : 'MP4',
        type: url.includes('.m3u8') ? 'hls' : 'mp4',
      });
    }
  } catch (error) {
    console.error('Error parsing video sources:', error);
  }
  
  // Remove duplicates
  const uniqueSources = sources.filter((source, index, self) =>
    index === self.findIndex((s) => s.url === source.url)
  );
  
  return uniqueSources;
};

/**
 * Get popular anime from homepage
 */
export const getAnimeflixPopular = async (): Promise<AnimeflixAnime[]> => {
  try {
    console.log('Fetching popular anime from Animeflix');
    
    const html = await fetchWithCache(`${ANIMEFLIX_BASE_URL}/popular`);
    
    return parseAnimeflixSearch(html);
  } catch (error) {
    console.error('Error fetching popular anime:', error);
    return [];
  }
};

/**
 * Get trending anime
 */
export const getAnimeflixTrending = async (): Promise<AnimeflixAnime[]> => {
  try {
    console.log('Fetching trending anime from Animeflix');
    
    const html = await fetchWithCache(`${ANIMEFLIX_BASE_URL}/trending`);
    
    return parseAnimeflixSearch(html);
  } catch (error) {
    console.error('Error fetching trending anime:', error);
    return [];
  }
};

/**
 * Get anime movies
 */
export const getAnimeflixMovies = async (): Promise<AnimeflixAnime[]> => {
  try {
    console.log('Fetching anime movies from Animeflix');
    
    const html = await fetchWithCache(`${ANIMEFLIX_BASE_URL}/movies`);
    
    return parseAnimeflixSearch(html);
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
};

/**
 * Get home page data
 */
export const getAnimeflixHome = async (): Promise<{
  popular: AnimeflixAnime[];
  trending: AnimeflixAnime[];
  movies: AnimeflixAnime[];
}> => {
  try {
    console.log('Fetching Animeflix home page');
    
    const [popular, trending, movies] = await Promise.all([
      getAnimeflixPopular().catch(() => []),
      getAnimeflixTrending().catch(() => []),
      getAnimeflixMovies().catch(() => []),
    ]);
    
    return { popular, trending, movies };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return { popular: [], trending: [], movies: [] };
  }
};

/**
 * Clean text (remove extra whitespace, HTML entities, etc.)
 */
const cleanText = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Rate limiter for scraping requests
 */
class ScrapingRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private delay = 1000; // 1 second between requests
  
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
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
    
    this.processing = false;
  }
}

export const animeflixRateLimiter = new ScrapingRateLimiter();

