/**
 * VIU Media Scraper
 * 
 * Scrapes anime from VIU (https://www.viu.com)
 * VIU is a popular Asian streaming platform with anime content
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 */

import { fetchWithCache, smartFetch } from './proxyService';

const VIU_BASE_URL = 'https://www.viu.com';
const VIU_API_URL = 'https://www.viu.com/ott';

export interface ViuAnime {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  bannerImage?: string;
  releaseYear?: string;
  genres?: string[];
  rating?: string;
  productId: string;
  seriesId?: string;
}

export interface ViuEpisode {
  id: string;
  number: number;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  productId: string;
}

export interface ViuStreamSource {
  url: string;
  quality: string;
  type: 'hls' | 'dash' | 'mp4';
  drm?: boolean;
}

/**
 * Search anime on VIU
 */
export const searchViuAnime = async (query: string): Promise<ViuAnime[]> => {
  try {
    console.log('Searching VIU for:', query);
    
    // VIU search endpoint (may need to be adjusted based on actual API)
    const searchUrl = `${VIU_API_URL}/v3/search?keyword=${encodeURIComponent(query)}&page=1&area_id=1`;
    
    const html = await fetchWithCache(searchUrl);
    
    // Try to parse JSON response
    let data;
    try {
      data = JSON.parse(html);
    } catch {
      // If not JSON, parse HTML
      return parseViuSearchHTML(html, query);
    }
    
    const results: ViuAnime[] = [];
    
    if (data && data.data && data.data.series) {
      data.data.series.forEach((series: any) => {
        if (series.category_name?.toLowerCase().includes('anime') || 
            series.description?.toLowerCase().includes('anime')) {
          results.push({
            id: series.series_id || series.product_id,
            title: series.name || series.series_name,
            description: series.description,
            coverImage: series.cover_image_url || series.poster_url,
            bannerImage: series.banner_url,
            releaseYear: series.release_year,
            genres: series.genres || [],
            rating: series.rating,
            productId: series.product_id,
            seriesId: series.series_id,
          });
        }
      });
    }
    
    console.log(`Found ${results.length} anime on VIU`);
    return results;
    
  } catch (error) {
    console.error('Error searching VIU:', error);
    return [];
  }
};

/**
 * Parse VIU search results from HTML
 */
const parseViuSearchHTML = (html: string, query: string): ViuAnime[] => {
  const results: ViuAnime[] = [];
  
  try {
    // Pattern for series data in HTML
    const seriesPattern = /"product_id":"([^"]+)".*?"series_name":"([^"]+)".*?"cover_image_url":"([^"]+)"/g;
    
    let match;
    while ((match = seriesPattern.exec(html)) !== null) {
      const title = decodeHTML(match[2]);
      
      // Filter for anime-related content
      if (title.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          id: match[1],
          title: title,
          coverImage: match[3].replace(/\\u002F/g, '/'),
          productId: match[1],
        });
      }
    }
  } catch (error) {
    console.error('Error parsing VIU HTML:', error);
  }
  
  return results;
};

/**
 * Get anime series details from VIU
 */
export const getViuAnimeInfo = async (seriesId: string): Promise<{
  anime: ViuAnime;
  episodes: ViuEpisode[];
} | null> => {
  try {
    console.log('Fetching VIU anime info for:', seriesId);
    
    // VIU series endpoint
    const seriesUrl = `${VIU_API_URL}/v3/series/${seriesId}?area_id=1`;
    
    const html = await fetchWithCache(seriesUrl);
    
    let data;
    try {
      data = JSON.parse(html);
    } catch {
      // Parse from HTML
      return parseViuSeriesHTML(html, seriesId);
    }
    
    if (!data || !data.data) return null;
    
    const seriesData = data.data;
    
    // Extract anime info
    const anime: ViuAnime = {
      id: seriesId,
      title: seriesData.name || seriesData.series_name,
      description: seriesData.description,
      coverImage: seriesData.cover_image_url,
      bannerImage: seriesData.banner_url,
      releaseYear: seriesData.release_year,
      genres: seriesData.genres || [],
      rating: seriesData.rating,
      productId: seriesData.product_id || seriesId,
      seriesId: seriesId,
    };
    
    // Extract episodes
    const episodes: ViuEpisode[] = [];
    
    if (seriesData.episodes && Array.isArray(seriesData.episodes)) {
      seriesData.episodes.forEach((ep: any, index: number) => {
        episodes.push({
          id: ep.product_id || `${seriesId}-ep-${index + 1}`,
          number: ep.episode_number || index + 1,
          title: ep.name || `Episode ${index + 1}`,
          description: ep.description,
          thumbnail: ep.cover_image_url,
          duration: ep.duration,
          productId: ep.product_id,
        });
      });
    }
    
    return { anime, episodes };
    
  } catch (error) {
    console.error('Error fetching VIU anime info:', error);
    return null;
  }
};

/**
 * Parse series info from HTML
 */
const parseViuSeriesHTML = (html: string, seriesId: string): {
  anime: ViuAnime;
  episodes: ViuEpisode[];
} | null => {
  try {
    // Extract series info
    const titleMatch = html.match(/"series_name":"([^"]+)"/);
    const descMatch = html.match(/"description":"([^"]+)"/);
    const coverMatch = html.match(/"cover_image_url":"([^"]+)"/);
    
    if (!titleMatch) return null;
    
    const anime: ViuAnime = {
      id: seriesId,
      title: decodeHTML(titleMatch[1]),
      description: descMatch ? decodeHTML(descMatch[1]) : undefined,
      coverImage: coverMatch ? coverMatch[1].replace(/\\u002F/g, '/') : undefined,
      productId: seriesId,
      seriesId: seriesId,
    };
    
    // Extract episodes
    const episodes: ViuEpisode[] = [];
    const episodePattern = /"product_id":"([^"]+)".*?"episode_number":(\d+).*?"name":"([^"]+)"/g;
    
    let match;
    while ((match = episodePattern.exec(html)) !== null) {
      episodes.push({
        id: match[1],
        number: parseInt(match[2]),
        title: decodeHTML(match[3]),
        productId: match[1],
      });
    }
    
    // Sort by episode number
    episodes.sort((a, b) => a.number - b.number);
    
    return { anime, episodes };
    
  } catch (error) {
    console.error('Error parsing VIU series HTML:', error);
    return null;
  }
};

/**
 * Get VIU episodes for a series
 */
export const getViuEpisodes = async (seriesId: string): Promise<ViuEpisode[]> => {
  const info = await getViuAnimeInfo(seriesId);
  return info?.episodes || [];
};

/**
 * Get streaming URL for VIU episode
 * Note: VIU uses DRM-protected streams, this returns the playback URL
 */
export const getViuStreamUrl = async (productId: string): Promise<ViuStreamSource[] | null> => {
  try {
    console.log('Fetching VIU stream URL for:', productId);
    
    // VIU playback endpoint
    const playbackUrl = `${VIU_API_URL}/v3/playback/${productId}?area_id=1`;
    
    const html = await fetchWithCache(playbackUrl);
    
    let data;
    try {
      data = JSON.parse(html);
    } catch {
      // Parse from HTML
      return parseViuStreamHTML(html);
    }
    
    if (!data || !data.data) return null;
    
    const sources: ViuStreamSource[] = [];
    
    // VIU typically provides HLS streams
    if (data.data.stream) {
      const stream = data.data.stream;
      
      if (stream.url) {
        sources.push({
          url: stream.url,
          quality: stream.quality || 'auto',
          type: stream.type || 'hls',
          drm: stream.drm || false,
        });
      }
      
      // Multiple quality options
      if (stream.qualities && Array.isArray(stream.qualities)) {
        stream.qualities.forEach((q: any) => {
          if (q.url) {
            sources.push({
              url: q.url,
              quality: q.label || q.quality || 'auto',
              type: 'hls',
              drm: q.drm || false,
            });
          }
        });
      }
    }
    
    return sources.length > 0 ? sources : null;
    
  } catch (error) {
    console.error('Error fetching VIU stream:', error);
    return null;
  }
};

/**
 * Parse stream URLs from HTML
 */
const parseViuStreamHTML = (html: string): ViuStreamSource[] | null => {
  const sources: ViuStreamSource[] = [];
  
  try {
    // Look for HLS manifest URLs
    const hlsPattern = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g;
    const matches = html.match(hlsPattern);
    
    if (matches) {
      matches.forEach(url => {
        sources.push({
          url: url,
          quality: 'auto',
          type: 'hls',
        });
      });
    }
    
    // Look for DASH manifest URLs
    const dashPattern = /(https?:\/\/[^"'\s]+\.mpd[^"'\s]*)/g;
    const dashMatches = html.match(dashPattern);
    
    if (dashMatches) {
      dashMatches.forEach(url => {
        sources.push({
          url: url,
          quality: 'auto',
          type: 'dash',
        });
      });
    }
  } catch (error) {
    console.error('Error parsing VIU stream HTML:', error);
  }
  
  return sources.length > 0 ? sources : null;
};

/**
 * Get VIU categories/genres
 */
export const getViuCategories = async (): Promise<string[]> => {
  try {
    const categoriesUrl = `${VIU_API_URL}/v3/categories?area_id=1`;
    const html = await fetchWithCache(categoriesUrl);
    
    let data;
    try {
      data = JSON.parse(html);
    } catch {
      return ['Anime', 'Action', 'Adventure', 'Fantasy', 'Romance'];
    }
    
    if (data && data.data && Array.isArray(data.data)) {
      return data.data
        .filter((cat: any) => cat.name)
        .map((cat: any) => cat.name);
    }
    
    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Get trending anime on VIU
 */
export const getViuTrending = async (): Promise<ViuAnime[]> => {
  try {
    const trendingUrl = `${VIU_API_URL}/v3/trending?area_id=1&category=anime`;
    const html = await fetchWithCache(trendingUrl);
    
    let data;
    try {
      data = JSON.parse(html);
    } catch {
      return [];
    }
    
    if (data && data.data && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        id: item.series_id || item.product_id,
        title: item.name || item.series_name,
        description: item.description,
        coverImage: item.cover_image_url,
        bannerImage: item.banner_url,
        rating: item.rating,
        productId: item.product_id,
        seriesId: item.series_id,
      }));
    }
    
    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Decode HTML entities
 */
const decodeHTML = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => 
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\\//g, '/')
    .replace(/\\/g, '')
    .trim();
};

/**
 * Check if VIU is available in region
 */
export const checkViuAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetch(VIU_BASE_URL, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Format VIU episode title
 */
export const formatViuEpisodeTitle = (episode: ViuEpisode): string => {
  if (episode.title && !episode.title.match(/^Episode \d+$/i)) {
    return `Ep ${episode.number}: ${episode.title}`;
  }
  return `Episode ${episode.number}`;
};

/**
 * Get direct playback URL (may require authentication)
 */
export const getViuPlaybackUrl = async (
  productId: string,
  quality: string = 'auto'
): Promise<string | null> => {
  const sources = await getViuStreamUrl(productId);
  
  if (!sources || sources.length === 0) return null;
  
  // Find requested quality or return auto
  const source = sources.find(s => s.quality === quality) || sources[0];
  return source.url;
};

/**
 * VIU Region codes
 */
export const VIU_REGIONS = {
  GLOBAL: 1,
  HONG_KONG: 2,
  SINGAPORE: 3,
  MALAYSIA: 4,
  INDONESIA: 5,
  THAILAND: 6,
  PHILIPPINES: 7,
  MYANMAR: 8,
  BAHRAIN: 9,
  EGYPT: 10,
  JORDAN: 11,
  KUWAIT: 12,
  OMAN: 13,
  QATAR: 14,
  SAUDI_ARABIA: 15,
  UAE: 16,
};

/**
 * Get anime by region
 */
export const getViuAnimeByRegion = async (regionId: number = VIU_REGIONS.GLOBAL): Promise<ViuAnime[]> => {
  try {
    const url = `${VIU_API_URL}/v3/anime?area_id=${regionId}&page=1&limit=50`;
    const html = await fetchWithCache(url);
    
    let data;
    try {
      data = JSON.parse(html);
    } catch {
      return [];
    }
    
    if (data && data.data && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        id: item.series_id || item.product_id,
        title: item.name || item.series_name,
        description: item.description,
        coverImage: item.cover_image_url,
        productId: item.product_id,
        seriesId: item.series_id,
      }));
    }
    
    return [];
  } catch (error) {
    return [];
  }
};

