/**
 * Shafilm File Server Scraper
 * 
 * Scrapes anime from https://prime.shafilm.vip/Series%20Anime/
 * This is a direct file server with folder-based organization
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 */

import { fetchWithCache } from './proxyService';

const SHAFILM_BASE_URL = 'https://prime.shafilm.vip/Series%20Anime';

export interface ShafilmAnime {
  id: string;
  title: string;
  folderName: string;
  url: string;
  lastModified?: string;
}

export interface ShafilmEpisode {
  id: string;
  number: number;
  title: string;
  url: string;
  size?: string;
  quality?: string;
  format?: string;
}

/**
 * Search Shafilm for anime by title
 */
export const searchShafilmAnime = async (query: string): Promise<ShafilmAnime[]> => {
  try {
    console.log('Searching Shafilm for:', query);
    
    // Get all anime from Shafilm
    const allAnime = await scrapeShafilmAnimeList();
    
    // Normalize query for matching
    const normalizedQuery = query.toLowerCase()
      .replace(/[:\-_\.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Normalized query:', normalizedQuery);
    
    // Search for matches
    const matches = allAnime.filter(anime => {
      const normalizedTitle = anime.title.toLowerCase()
        .replace(/[:\-_\.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Check if query is contained in title or vice versa
      return normalizedTitle.includes(normalizedQuery) || 
             normalizedQuery.includes(normalizedTitle);
    });
    
    console.log(`Found ${matches.length} matches on Shafilm`);
    matches.forEach(m => console.log(`  - ${m.title} (${m.folderName})`));
    
    return matches;
  } catch (error) {
    console.error('Error searching Shafilm:', error);
    return [];
  }
};

/**
 * Parse directory listing HTML to extract anime folders
 */
export const scrapeShafilmAnimeList = async (): Promise<ShafilmAnime[]> => {
  try {
    console.log('Fetching Shafilm anime list...');
    const html = await fetchWithCache(SHAFILM_BASE_URL + '/');
    
    const animes: ShafilmAnime[] = [];
    
    // Parse directory links
    // Pattern: <a href="Folder.Name/">Folder.Name/</a>
    const folderPattern = /<a href="([^"]+\/)">([^<]+)<\/a>\s*(\d{2}-\w{3}-\d{4} \d{2}:\d{2})?/g;
    
    let match;
    while ((match = folderPattern.exec(html)) !== null) {
      const folderName = match[1].replace('/', '');
      const displayName = match[2].replace('/', '');
      const lastModified = match[3] || '';
      
      // Skip parent directory link
      if (folderName === '..') continue;
      
      // Clean up title
      const title = cleanAnimeTitle(displayName);
      
      animes.push({
        id: folderName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        title: title,
        folderName: folderName,
        url: `${SHAFILM_BASE_URL}/${encodeURIComponent(folderName)}/`,
        lastModified: lastModified.trim(),
      });
    }
    
    console.log(`Found ${animes.length} anime on Shafilm`);
    return animes;
    
  } catch (error) {
    console.error('Error scraping Shafilm anime list:', error);
    return [];
  }
};


/**
 * Get episodes for a specific anime
 */
export const scrapeShafilmEpisodes = async (folderName: string): Promise<ShafilmEpisode[]> => {
  try {
    console.log(`Fetching episodes for: ${folderName}`);
    const url = `${SHAFILM_BASE_URL}/${encodeURIComponent(folderName)}/`;
    const html = await fetchWithCache(url);
    
    const episodes: ShafilmEpisode[] = [];
    
    // Pattern for file links
    // <a href="Episode.01.mp4">Episode.01.mp4</a>    Date    Size
    const filePattern = /<a href="([^"]+\.(?:mp4|mkv|avi))">([^<]+)<\/a>\s*(\d{2}-\w{3}-\d{4} \d{2}:\d{2})?\s*([0-9.]+[KMG])?/gi;
    
    let match;
    while ((match = filePattern.exec(html)) !== null) {
      const fileName = match[1];
      const displayName = match[2];
      const date = match[3] || '';
      const size = match[4] || '';
      
      // Extract episode number
      const episodeNumber = extractEpisodeNumber(fileName);
      
      // Determine quality and format
      const quality = extractQuality(fileName);
      const format = fileName.split('.').pop()?.toUpperCase() || 'MP4';
      
      episodes.push({
        id: `${folderName}-episode-${episodeNumber}`,
        number: episodeNumber,
        title: displayName,
        url: `${SHAFILM_BASE_URL}/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`,
        size: size,
        quality: quality,
        format: format,
      });
    }
    
    // Sort by episode number
    episodes.sort((a, b) => a.number - b.number);
    
    console.log(`Found ${episodes.length} episodes`);
    return episodes;
    
  } catch (error) {
    console.error('Error scraping episodes:', error);
    return [];
  }
};

/**
 * Get direct download/stream URL for an episode
 */
export const getShafilmStreamUrl = async (folderName: string, fileName: string): Promise<string> => {
  return `${SHAFILM_BASE_URL}/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`;
};

/**
 * Clean up anime title for display
 */
const cleanAnimeTitle = (rawTitle: string): string => {
  return rawTitle
    // Remove file extensions
    .replace(/\.(mp4|mkv|avi)$/i, '')
    // Replace dots and underscores with spaces
    .replace(/[._]/g, ' ')
    // Remove year in parentheses
    .replace(/\s*\(\d{4}\)\s*$/g, '')
    // Remove common tags
    .replace(/\s*\[.*?\]\s*/g, ' ')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extract episode number from filename
 */
const extractEpisodeNumber = (fileName: string): number => {
  // Try various patterns
  const patterns = [
    /[Ee]pisode[.\s]*(\d+)/i,
    /[Ee]p[.\s]*(\d+)/i,
    /[Ss]\d+[Ee](\d+)/i,  // S01E01 format
    /\s-\s(\d+)/,          // - 01 format
    /\.(\d+)\./,           // .01. format
    /\s(\d{2,3})\s/,       // Space-separated numbers
  ];
  
  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  // If no pattern matches, try to find any 2-3 digit number
  const numberMatch = fileName.match(/(\d{2,3})/);
  return numberMatch ? parseInt(numberMatch[1], 10) : 1;
};

/**
 * Extract quality from filename
 */
const extractQuality = (fileName: string): string => {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('2160p') || lowerName.includes('4k')) return '4K';
  if (lowerName.includes('1080p')) return '1080p';
  if (lowerName.includes('720p')) return '720p';
  if (lowerName.includes('480p')) return '480p';
  if (lowerName.includes('360p')) return '360p';
  
  // Check for quality indicators
  if (lowerName.includes('bluray') || lowerName.includes('blu-ray')) return '1080p';
  if (lowerName.includes('web-dl') || lowerName.includes('webrip')) return '720p';
  
  return 'HD'; // Default
};

/**
 * Get anime info from Shafilm
 */
export const getShafilmAnimeInfo = async (folderName: string): Promise<{
  title: string;
  episodes: ShafilmEpisode[];
  totalEpisodes: number;
  source: string;
} | null> => {
  try {
    const episodes = await scrapeShafilmEpisodes(folderName);
    
    if (episodes.length === 0) return null;
    
    return {
      title: cleanAnimeTitle(folderName),
      episodes: episodes,
      totalEpisodes: episodes.length,
      source: 'Shafilm',
    };
  } catch (error) {
    console.error('Error getting anime info:', error);
    return null;
  }
};

/**
 * Check if a file is a video file
 */
export const isVideoFile = (fileName: string): boolean => {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
  return videoExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
};

/**
 * Get seasons if anime has multiple seasons
 */
export const getAnimeSeasons = async (folderName: string): Promise<string[]> => {
  try {
    const url = `${SHAFILM_BASE_URL}/${encodeURIComponent(folderName)}/`;
    const html = await fetchWithCache(url);
    
    const seasons: string[] = [];
    const seasonPattern = /<a href="([^"]+\/)">[^<]*[Ss]eason[^<]*<\/a>/gi;
    
    let match;
    while ((match = seasonPattern.exec(html)) !== null) {
      seasons.push(match[1].replace('/', ''));
    }
    
    return seasons;
  } catch (error) {
    return [];
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (size: string): string => {
  if (!size) return '';
  
  const num = parseFloat(size);
  const unit = size.replace(/[0-9.]/g, '');
  
  if (unit === 'K') return `${num.toFixed(1)} KB`;
  if (unit === 'M') return `${num.toFixed(1)} MB`;
  if (unit === 'G') return `${num.toFixed(2)} GB`;
  
  return size;
};

/**
 * Batch fetch anime details
 */
export const batchFetchAnimeInfo = async (
  folderNames: string[], 
  maxConcurrent: number = 3
): Promise<Map<string, ShafilmEpisode[]>> => {
  const results = new Map<string, ShafilmEpisode[]>();
  
  // Process in batches
  for (let i = 0; i < folderNames.length; i += maxConcurrent) {
    const batch = folderNames.slice(i, i + maxConcurrent);
    const promises = batch.map(name => scrapeShafilmEpisodes(name));
    
    const batchResults = await Promise.all(promises);
    
    batch.forEach((name, index) => {
      results.set(name, batchResults[index]);
    });
    
    // Small delay between batches
    if (i + maxConcurrent < folderNames.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};

