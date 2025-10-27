/**
 * Torrent Streaming Service
 * 
 * Provides torrent search and streaming capabilities for anime content.
 * Uses multiple torrent APIs for maximum content availability.
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 * Torrent streaming should only be used for legally distributable content.
 * Always respect copyright laws and content licensing.
 */

export interface TorrentAnime {
  id: string;
  title: string;
  magnet: string;
  seeders: number;
  leechers: number;
  size: string;
  quality: string;
  type: string; // 'batch' | 'episode'
  episode?: number;
  resolution?: string;
  source: string;
  category?: string;
}

export interface TorrentStreamSource {
  url: string;
  quality: string;
  type: string;
  magnet: string;
  seeders: number;
  size: string;
}

// Torrent search APIs
const TORRENT_APIS = {
  NYAA: 'https://nyaa.si',
  SUBSPLEASE: 'https://subsplease.org',
  ANIMETOSHO: 'https://animetosho.org',
};

/**
 * Search anime torrents on Nyaa.si
 */
export const searchNyaaTorrents = async (query: string): Promise<TorrentAnime[]> => {
  try {
    console.log('Searching Nyaa for:', query);
    
    // Nyaa RSS feed for search
    const searchUrl = `${TORRENT_APIS.NYAA}/?page=rss&q=${encodeURIComponent(query)}&c=1_2&f=0`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // Parse RSS feed
    const torrents = parseNyaaRSS(xmlText);
    
    console.log(`Found ${torrents.length} torrents on Nyaa`);
    return torrents;
  } catch (error) {
    console.error('Error searching Nyaa:', error);
    return [];
  }
};

/**
 * Parse Nyaa RSS feed
 */
const parseNyaaRSS = (xmlText: string): TorrentAnime[] => {
  const torrents: TorrentAnime[] = [];
  
  try {
    // Extract items from RSS
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = xmlText.match(itemRegex);
    
    if (!items) return torrents;
    
    items.forEach((item, index) => {
      try {
        const title = extractXMLTag(item, 'title');
        const link = extractXMLTag(item, 'link');
        const seeders = parseInt(extractXMLTag(item, 'nyaa:seeders') || '0');
        const leechers = parseInt(extractXMLTag(item, 'nyaa:leechers') || '0');
        const size = extractXMLTag(item, 'nyaa:size');
        const category = extractXMLTag(item, 'nyaa:category');
        
        // Extract magnet link from description
        const description = extractXMLTag(item, 'description');
        const magnetMatch = description.match(/magnet:\?[^"'\s]+/);
        const magnet = magnetMatch ? magnetMatch[0] : '';
        
        // Parse quality from title
        const quality = extractQuality(title);
        const resolution = extractResolution(title);
        const episode = extractEpisode(title);
        
        if (title && magnet) {
          torrents.push({
            id: `nyaa-${index}`,
            title,
            magnet,
            seeders,
            leechers,
            size: size || 'Unknown',
            quality: quality || 'Unknown',
            type: episode ? 'episode' : 'batch',
            episode,
            resolution,
            source: 'Nyaa',
            category,
          });
        }
      } catch (err) {
        console.error('Error parsing torrent item:', err);
      }
    });
  } catch (error) {
    console.error('Error parsing RSS:', error);
  }
  
  return torrents;
};

/**
 * Extract XML tag content
 */
const extractXMLTag = (xml: string, tag: string): string => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
};

/**
 * Extract quality from title
 */
const extractQuality = (title: string): string => {
  const qualities = ['1080p', '720p', '480p', '360p', 'BD', 'BluRay', 'WEB', 'WEBRip', 'DVDRip'];
  
  for (const quality of qualities) {
    if (title.toLowerCase().includes(quality.toLowerCase())) {
      return quality;
    }
  }
  
  return 'Unknown';
};

/**
 * Extract resolution from title
 */
const extractResolution = (title: string): string | undefined => {
  const resMatch = title.match(/(\d{3,4}p)/i);
  return resMatch ? resMatch[1] : undefined;
};

/**
 * Extract episode number from title
 */
const extractEpisode = (title: string): number | undefined => {
  // Match patterns like "Episode 12", "EP12", "E12", "- 12"
  const patterns = [
    /episode\s*(\d+)/i,
    /ep\.?\s*(\d+)/i,
    /\be(\d+)\b/i,
    /\s-\s(\d+)\b/,
    /\[(\d+)\]/,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return undefined;
};

/**
 * Search anime torrents on SubsPlease
 */
export const searchSubsPleaseTorrents = async (query: string): Promise<TorrentAnime[]> => {
  try {
    console.log('Searching SubsPlease for:', query);
    
    // SubsPlease API endpoint
    const searchUrl = `${TORRENT_APIS.SUBSPLEASE}/api/?f=search&tz=America/New_York&s=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse SubsPlease results
    const torrents = parseSubsPleaseResults(data, query);
    
    console.log(`Found ${torrents.length} torrents on SubsPlease`);
    return torrents;
  } catch (error) {
    console.error('Error searching SubsPlease:', error);
    return [];
  }
};

/**
 * Parse SubsPlease results
 */
const parseSubsPleaseResults = (data: any, query: string): TorrentAnime[] => {
  const torrents: TorrentAnime[] = [];
  
  try {
    if (!data || !data.results) return torrents;
    
    Object.entries(data.results).forEach(([showName, episodes]: [string, any]) => {
      if (!episodes || typeof episodes !== 'object') return;
      
      Object.entries(episodes).forEach(([epNum, epData]: [string, any]) => {
        if (!epData || !epData.downloads) return;
        
        // Get 1080p version
        const torrent1080 = epData.downloads['1080'];
        if (torrent1080) {
          torrents.push({
            id: `subsplease-${showName}-${epNum}-1080`,
            title: `${showName} - ${epNum} (1080p)`,
            magnet: torrent1080.magnet,
            seeders: 50, // SubsPlease usually has good seeds
            leechers: 10,
            size: formatBytes(torrent1080.bytes || 0),
            quality: '1080p',
            type: 'episode',
            episode: parseInt(epNum),
            resolution: '1080p',
            source: 'SubsPlease',
          });
        }
        
        // Get 720p version
        const torrent720 = epData.downloads['720'];
        if (torrent720) {
          torrents.push({
            id: `subsplease-${showName}-${epNum}-720`,
            title: `${showName} - ${epNum} (720p)`,
            magnet: torrent720.magnet,
            seeders: 50,
            leechers: 10,
            size: formatBytes(torrent720.bytes || 0),
            quality: '720p',
            type: 'episode',
            episode: parseInt(epNum),
            resolution: '720p',
            source: 'SubsPlease',
          });
        }
      });
    });
  } catch (error) {
    console.error('Error parsing SubsPlease results:', error);
  }
  
  return torrents;
};

/**
 * Format bytes to human readable
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Search anime torrents on AnimeTosho
 */
export const searchAnimeToshoTorrents = async (query: string): Promise<TorrentAnime[]> => {
  try {
    console.log('Searching AnimeTosho for:', query);
    
    // AnimeTosho XML feed
    const searchUrl = `${TORRENT_APIS.ANIMETOSHO}/search.xml?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // Parse XML feed
    const torrents = parseAnimeToshoXML(xmlText);
    
    console.log(`Found ${torrents.length} torrents on AnimeTosho`);
    return torrents;
  } catch (error) {
    console.error('Error searching AnimeTosho:', error);
    return [];
  }
};

/**
 * Parse AnimeTosho XML feed
 */
const parseAnimeToshoXML = (xmlText: string): TorrentAnime[] => {
  const torrents: TorrentAnime[] = [];
  
  try {
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = xmlText.match(itemRegex);
    
    if (!items) return torrents;
    
    items.forEach((item, index) => {
      try {
        const title = extractXMLTag(item, 'title');
        const link = extractXMLTag(item, 'link');
        
        // Extract magnet from link or guid
        const guid = extractXMLTag(item, 'guid');
        const magnet = guid.startsWith('magnet:') ? guid : `magnet:?xt=urn:btih:${extractInfoHash(guid)}`;
        
        // Extract metadata
        const description = extractXMLTag(item, 'description');
        const size = extractSizeFromDesc(description);
        const quality = extractQuality(title);
        const resolution = extractResolution(title);
        const episode = extractEpisode(title);
        
        if (title && magnet) {
          torrents.push({
            id: `animetosho-${index}`,
            title,
            magnet,
            seeders: 20, // Estimate
            leechers: 5,
            size: size || 'Unknown',
            quality: quality || 'Unknown',
            type: episode ? 'episode' : 'batch',
            episode,
            resolution,
            source: 'AnimeTosho',
          });
        }
      } catch (err) {
        console.error('Error parsing AnimeTosho item:', err);
      }
    });
  } catch (error) {
    console.error('Error parsing AnimeTosho XML:', error);
  }
  
  return torrents;
};

/**
 * Extract info hash from URL or GUID
 */
const extractInfoHash = (str: string): string => {
  const hashMatch = str.match(/[a-fA-F0-9]{40}/);
  return hashMatch ? hashMatch[0] : '';
};

/**
 * Extract size from description
 */
const extractSizeFromDesc = (description: string): string | undefined => {
  const sizeMatch = description.match(/Size:\s*([0-9.]+\s*[KMGT]?B)/i);
  return sizeMatch ? sizeMatch[1] : undefined;
};

/**
 * Search all torrent sources concurrently
 */
export const searchAllTorrentSources = async (query: string): Promise<TorrentAnime[]> => {
  console.log('Searching all torrent sources for:', query);
  
  const [nyaa, subsplease, animetosho] = await Promise.all([
    searchNyaaTorrents(query).catch(() => []),
    searchSubsPleaseTorrents(query).catch(() => []),
    searchAnimeToshoTorrents(query).catch(() => []),
  ]);
  
  const allTorrents = [...nyaa, ...subsplease, ...animetosho];
  
  // Sort by seeders (descending)
  allTorrents.sort((a, b) => b.seeders - a.seeders);
  
  console.log(`Total torrents found: ${allTorrents.length}`);
  return allTorrents;
};

/**
 * Filter torrents by quality
 */
export const filterTorrentsByQuality = (
  torrents: TorrentAnime[],
  quality: string
): TorrentAnime[] => {
  return torrents.filter(t => 
    t.quality.toLowerCase().includes(quality.toLowerCase()) ||
    t.resolution?.toLowerCase().includes(quality.toLowerCase())
  );
};

/**
 * Filter torrents by episode
 */
export const filterTorrentsByEpisode = (
  torrents: TorrentAnime[],
  episode: number
): TorrentAnime[] => {
  return torrents.filter(t => t.episode === episode);
};

/**
 * Get best torrent (most seeders, good quality)
 */
export const getBestTorrent = (torrents: TorrentAnime[]): TorrentAnime | null => {
  if (torrents.length === 0) return null;
  
  // Prioritize 1080p with most seeders
  const hq1080 = torrents.filter(t => 
    t.resolution === '1080p' && t.seeders > 5
  );
  if (hq1080.length > 0) return hq1080[0];
  
  // Then 720p with most seeders
  const hq720 = torrents.filter(t => 
    t.resolution === '720p' && t.seeders > 5
  );
  if (hq720.length > 0) return hq720[0];
  
  // Otherwise, just return the one with most seeders
  return torrents[0];
};

/**
 * Convert torrent to stream source
 * Note: Actual streaming requires WebTorrent or similar library
 */
export const torrentToStreamSource = (torrent: TorrentAnime): TorrentStreamSource => {
  return {
    url: torrent.magnet, // In actual implementation, this would be a streaming URL
    quality: torrent.quality,
    type: 'torrent',
    magnet: torrent.magnet,
    seeders: torrent.seeders,
    size: torrent.size,
  };
};

/**
 * Check if torrent is healthy (enough seeders)
 */
export const isTorrentHealthy = (torrent: TorrentAnime): boolean => {
  return torrent.seeders >= 5; // At least 5 seeders
};

/**
 * Get torrent statistics
 */
export const getTorrentStats = (torrents: TorrentAnime[]) => {
  const total = torrents.length;
  const healthy = torrents.filter(isTorrentHealthy).length;
  const episodes = torrents.filter(t => t.type === 'episode').length;
  const batches = torrents.filter(t => t.type === 'batch').length;
  
  const bySource = torrents.reduce((acc, t) => {
    acc[t.source] = (acc[t.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byQuality = torrents.reduce((acc, t) => {
    acc[t.quality] = (acc[t.quality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total,
    healthy,
    episodes,
    batches,
    bySource,
    byQuality,
  };
};

/**
 * Format magnet link with trackers
 */
export const formatMagnetLink = (infoHash: string, title: string): string => {
  const trackers = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://tracker.tiny-vps.com:6969/announce',
    'http://tracker.nyaa.uk:6969/announce',
  ];
  
  const trackersParam = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
  
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}${trackersParam}`;
};

/**
 * Cache for torrent search results
 */
class TorrentCache {
  private cache = new Map<string, { data: TorrentAnime[]; timestamp: number }>();
  private ttl = 1800000; // 30 minutes
  
  set(key: string, data: TorrentAnime[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + this.ttl,
    });
  }
  
  get(key: string): TorrentAnime[] | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const torrentCache = new TorrentCache();

/**
 * Search torrents with caching
 */
export const searchTorrentsCached = async (query: string): Promise<TorrentAnime[]> => {
  const cacheKey = `torrent:${query}`;
  const cached = torrentCache.get(cacheKey);
  
  if (cached) {
    console.log('Using cached torrent results');
    return cached;
  }
  
  const results = await searchAllTorrentSources(query);
  torrentCache.set(cacheKey, results);
  
  return results;
};

/**
 * ⚠️ IMPORTANT: Torrent Streaming Requirements
 * 
 * To actually stream torrents in React Native, you'll need:
 * 
 * 1. WebTorrent for React Native:
 *    - npm install webtorrent-react-native
 *    - Or use a custom native module
 * 
 * 2. Video player that supports streaming:
 *    - Already using expo-av
 *    - Can stream from local HTTP server
 * 
 * 3. Backend proxy (optional but recommended):
 *    - Convert magnet to streamable URL
 *    - Handle torrent downloading/buffering
 * 
 * 4. Legal considerations:
 *    - Only use for legally distributable content
 *    - Respect copyright laws
 *    - Consider using only for open-source anime
 */

export const TORRENT_DISCLAIMER = `
⚠️ TORRENT STREAMING DISCLAIMER ⚠️

This torrent integration is provided for EDUCATIONAL PURPOSES ONLY.

Important Notes:
1. Only use for legally distributable content
2. Respect copyright laws and licensing
3. BitTorrent is a legitimate protocol, but content may not be
4. You are responsible for the content you access
5. Consider using official streaming services for licensed content

For production use:
- Implement proper legal checks
- Get appropriate licenses
- Use only authorized content
`;

