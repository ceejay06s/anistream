/**
 * AniWatch Scraper
 * 
 * Web scraping service for https://aniwatchtv.to/
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 * This is for educational purposes only.
 * For production, use official APIs or get proper licensing.
 */

import { fetchWithCache } from './proxyService';

const ANIWATCH_BASE_URL = 'https://aniwatchtv.to';

export interface AniwatchAnime {
  id: string;
  title: string;
  url: string;
  image?: string;
  description?: string;
  type?: string;
  rating?: string;
  duration?: string;
  totalEpisodes?: number;
}

export interface AniwatchEpisode {
  id: string;
  number: number;
  title: string;
  url: string;
  type?: string; // 'sub' or 'dub'
}

export interface AniwatchStreamSource {
  url: string;
  quality: string;
  type: string;
  headers?: Record<string, string>;
}

/**
 * Search anime on AniWatch
 */
export const searchAniwatchAnime = async (query: string): Promise<AniwatchAnime[]> => {
  try {
    console.log('Searching AniWatch for:', query);
    
    // AniWatch search endpoint
    const searchUrl = `${ANIWATCH_BASE_URL}/search?keyword=${encodeURIComponent(query)}`;
    console.log('Search URL:', searchUrl);
    
    const html = await fetchWithCache(searchUrl);
    
    console.log('Search HTML length:', html.length);
    console.log('Search HTML preview:', html.substring(0, 500));
    
    // Parse HTML to extract anime results
    const animes = parseAniwatchSearch(html, query);
    
    console.log(`Found ${animes.length} results on AniWatch`);
    
    // If no results, try alternative search strategies
    if (animes.length === 0) {
      console.log('No results found, trying alternative search...');
      
      // Try searching without "Season X"
      if (query.includes('Season')) {
        const baseQuery = query.replace(/Season\s*\d+/i, '').trim();
        console.log('Trying search without season:', baseQuery);
        
        const altSearchUrl = `${ANIWATCH_BASE_URL}/search?keyword=${encodeURIComponent(baseQuery)}`;
        const altHtml = await fetchWithCache(altSearchUrl);
        const altResults = parseAniwatchSearch(altHtml, baseQuery);
        
        if (altResults.length > 0) {
          console.log(`Found ${altResults.length} results with alternative search`);
          return altResults;
        }
      }
    }
    
    return animes;
  } catch (error) {
    console.error('Error searching AniWatch:', error);
    return [];
  }
};

/**
 * Parse AniWatch search results
 */
const parseAniwatchSearch = (html: string, query?: string): AniwatchAnime[] => {
  const animes: AniwatchAnime[] = [];
  
  try {
    console.log('Parsing search results HTML...');
    
    // Extract anime cards - AniWatch uses .flw-item or similar
    const cardRegex = /<div[^>]*class="[^"]*flw-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    const cards = html.match(cardRegex) || [];
    
    console.log(`Found ${cards.length} anime cards in HTML`);
    
    if (cards.length === 0) {
      console.warn('No anime cards found. HTML might have different structure.');
      // Try alternative card patterns
      const altCardRegex = /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      const altCards = html.match(altCardRegex) || [];
      console.log(`Alternative pattern found ${altCards.length} cards`);
    }
    
    cards.forEach((card, index) => {
      try {
        // Extract title
        const titleMatch = card.match(/<h3[^>]*class="[^"]*film-name[^"]*"[^>]*>.*?<a[^>]*title="([^"]+)"/i) ||
                          card.match(/data-title="([^"]+)"/) ||
                          card.match(/<a[^>]*title="([^"]+)"/);
        const title = titleMatch ? cleanText(titleMatch[1]) : '';
        
        // Extract URL
        const urlMatch = card.match(/<a[^>]*href="([^"]*\/watch\/[^"]+)"/i);
        const url = urlMatch ? urlMatch[1] : '';
        
        // Extract ID from URL - AniWatch format varies
        // Formats: /watch/anime-name-12345 or /watch/spy-x-family-season-3-19888
        let id = `aniwatch-${index}`;
        if (url) {
          // Try to extract the last part after final hyphen (usually the ID)
          const urlParts = url.split('/').pop(); // Get "anime-name-12345"
          if (urlParts) {
            const idMatch = urlParts.match(/-(\d+)$/); // Match "-12345" at end
            if (idMatch) {
              id = urlParts; // Use full slug as ID
            }
          }
        }
        
        // Extract image
        const imgMatch = card.match(/data-src="([^"]+)"/) ||
                        card.match(/<img[^>]*src="([^"]+)"/);
        const image = imgMatch ? imgMatch[1] : '';
        
        // Extract type (TV, Movie, OVA, etc.)
        const typeMatch = card.match(/<span[^>]*class="[^"]*fdi-item[^"]*"[^>]*>([^<]+)<\/span>/i);
        const type = typeMatch ? cleanText(typeMatch[1]) : '';
        
        // Extract rating
        const ratingMatch = card.match(/<span[^>]*class="[^"]*tick-rate[^"]*"[^>]*>([^<]+)<\/span>/i);
        const rating = ratingMatch ? cleanText(ratingMatch[1]) : '';
        
        // Extract duration
        const durationMatch = card.match(/<span[^>]*class="[^"]*fdi-duration[^"]*"[^>]*>([^<]+)<\/span>/i);
        const duration = durationMatch ? cleanText(durationMatch[1]) : '';
        
        if (title && url) {
          console.log(`Parsed anime ${index + 1}: ${title} (${id})`);
          animes.push({
            id,
            title,
            url: url.startsWith('http') ? url : `${ANIWATCH_BASE_URL}${url}`,
            image: image.startsWith('http') ? image : (image ? `${ANIWATCH_BASE_URL}${image}` : undefined),
            type,
            rating,
            duration,
          });
        } else {
          console.warn(`Card ${index + 1} missing title or URL. Title: ${title}, URL: ${url}`);
        }
      } catch (err) {
        console.error(`Error parsing anime card ${index + 1}:`, err);
      }
    });
  } catch (error) {
    console.error('Error parsing search results:', error);
  }
  
  return animes;
};

/**
 * Get anime details and episodes from watch page
 */
export const getAniwatchAnimeInfo = async (animeId: string): Promise<{
  anime: AniwatchAnime;
  episodes: AniwatchEpisode[];
} | null> => {
  try {
    console.log('Fetching AniWatch anime info for:', animeId);
    
    // Try to construct watch URL
    // If animeId is just a number, we need the full URL
    let watchUrl = '';
    if (animeId.includes('/watch/')) {
      watchUrl = animeId.startsWith('http') ? animeId : `${ANIWATCH_BASE_URL}${animeId}`;
    } else if (animeId.match(/^[a-z0-9-]+-\d+$/)) {
      // Format: anime-name-12345
      watchUrl = `${ANIWATCH_BASE_URL}/watch/${animeId}`;
    } else if (animeId.match(/^\d+$/)) {
      // Just a number - can't construct URL, need to search first
      console.error('Cannot construct URL from just ID:', animeId);
      return null;
    } else {
      watchUrl = `${ANIWATCH_BASE_URL}/watch/${animeId}`;
    }
    
    const html = await fetchWithCache(watchUrl);
    
    // Parse anime details
    const anime = parseAniwatchAnimeDetails(html, animeId);
    
    // Parse episodes
    const episodes = parseAniwatchEpisodes(html, animeId);
    
    console.log(`Found ${episodes.length} episodes`);
    
    return { anime, episodes };
  } catch (error) {
    console.error('Error fetching anime info:', error);
    return null;
  }
};

/**
 * Parse anime details from watch page
 */
const parseAniwatchAnimeDetails = (html: string, animeId: string): AniwatchAnime => {
  try {
    // Extract title
    const titleMatch = html.match(/<h2[^>]*class="[^"]*film-name[^"]*"[^>]*>([^<]+)<\/h2>/i) ||
                      html.match(/<h1[^>]*class="[^"]*heading-name[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/i) ||
                      html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? cleanText(titleMatch[1].replace(' - AniWatch', '').replace(' English Subbed', '').replace(' English Dubbed', '')) : animeId;
    
    // Extract description
    const descMatch = html.match(/<div[^>]*class="[^"]*film-description[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                     html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                     html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    const description = descMatch ? cleanText(descMatch[1]) : '';
    
    // Extract image
    const imgMatch = html.match(/<img[^>]*class="[^"]*film-poster-img[^"]*"[^>]*src="([^"]+)"/i) ||
                    html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    const image = imgMatch ? imgMatch[1] : '';
    
    // Extract type
    const typeMatch = html.match(/<span[^>]*class="[^"]*item[^"]*"[^>]*>Type:<\/span>\s*<a[^>]*>([^<]+)<\/a>/i);
    const type = typeMatch ? cleanText(typeMatch[1]) : '';
    
    // Extract rating
    const ratingMatch = html.match(/<span[^>]*class="[^"]*item[^"]*"[^>]*>Rating:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i) ||
                       html.match(/<div[^>]*class="[^"]*tick-rate[^"]*"[^>]*>([^<]+)<\/div>/i);
    const rating = ratingMatch ? cleanText(ratingMatch[1]) : '';
    
    // Extract duration
    const durationMatch = html.match(/<span[^>]*class="[^"]*item[^"]*"[^>]*>Duration:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i);
    const duration = durationMatch ? cleanText(durationMatch[1]) : '';
    
    // Extract total episodes
    const episodesMatch = html.match(/<span[^>]*class="[^"]*item[^"]*"[^>]*>Episodes:<\/span>\s*<span[^>]*>(\d+)<\/span>/i);
    const totalEpisodes = episodesMatch ? parseInt(episodesMatch[1]) : undefined;
    
    return {
      id: animeId,
      title,
      url: `${ANIWATCH_BASE_URL}/watch/${animeId}`,
      image: image.startsWith('http') ? image : (image ? `${ANIWATCH_BASE_URL}${image}` : undefined),
      description,
      type,
      rating,
      duration,
      totalEpisodes,
    };
  } catch (error) {
    console.error('Error parsing anime details:', error);
    return {
      id: animeId,
      title: animeId,
      url: `${ANIWATCH_BASE_URL}/watch/${animeId}`,
    };
  }
};

/**
 * Parse episode list from watch page
 */
const parseAniwatchEpisodes = (html: string, animeId: string): AniwatchEpisode[] => {
  const episodes: AniwatchEpisode[] = [];
  
  try {
    // Look for episode list
    // AniWatch typically has episode data in data-id attributes or as links
    
    // Method 1: Look for episode links in sidebar
    const episodeRegex = /<a[^>]*class="[^"]*ep-item[^"]*"[^>]*href="([^"]*\/watch\/[^"]+\?ep=(\d+))"[^>]*title="([^"]*)"[^>]*>/gi;
    let match;
    
    while ((match = episodeRegex.exec(html)) !== null) {
      const url = match[1];
      const epNumber = parseInt(match[2]);
      const title = match[3] || `Episode ${epNumber}`;
      
      episodes.push({
        id: `${animeId}-episode-${epNumber}`,
        number: epNumber,
        title: cleanText(title),
        url: url.startsWith('http') ? url : `${ANIWATCH_BASE_URL}${url}`,
      });
    }
    
    // Method 2: Look for data-number attributes
    if (episodes.length === 0) {
      const dataEpRegex = /<a[^>]*class="[^"]*ep-item[^"]*"[^>]*data-number="(\d+)"[^>]*data-id="([^"]+)"[^>]*>/gi;
      
      while ((match = dataEpRegex.exec(html)) !== null) {
        const epNumber = parseInt(match[1]);
        const epId = match[2];
        
        episodes.push({
          id: epId,
          number: epNumber,
          title: `Episode ${epNumber}`,
          url: `${ANIWATCH_BASE_URL}/watch/${animeId}?ep=${epNumber}`,
        });
      }
    }
    
    // Method 3: Look for numbered links
    if (episodes.length === 0) {
      const numberedRegex = /<a[^>]*href="([^"]*\?ep=(\d+))"[^>]*>(\d+)<\/a>/gi;
      
      while ((match = numberedRegex.exec(html)) !== null) {
        const url = match[1];
        const epNumber = parseInt(match[2]);
        
        episodes.push({
          id: `${animeId}-episode-${epNumber}`,
          number: epNumber,
          title: `Episode ${epNumber}`,
          url: url.startsWith('http') ? url : `${ANIWATCH_BASE_URL}${url}`,
        });
      }
    }
  } catch (error) {
    console.error('Error parsing episodes:', error);
  }
  
  // Sort by episode number
  episodes.sort((a, b) => a.number - b.number);
  
  // Remove duplicates
  const uniqueEpisodes = episodes.filter((ep, index, self) =>
    index === self.findIndex((e) => e.number === ep.number)
  );
  
  return uniqueEpisodes;
};

/**
 * Get streaming sources for episode using AniWatch AJAX API
 */
export const getAniwatchStreamSources = async (
  episodeUrl: string
): Promise<AniwatchStreamSource[]> => {
  try {
    console.log('Fetching stream sources from:', episodeUrl);
    
    // Step 1: Fetch the episode page to extract the episode source ID
    const html = await fetchWithCache(episodeUrl);
    
    console.log('HTML length:', html.length);
    
    // Step 2: Extract episode source ID from HTML
    // Look for data-id attributes in server items or episode data
    const episodeIdPatterns = [
      /data-id=["'](\d+)["'][^>]*class=["'][^"']*server-item/i,
      /data-id=["'](\d+)["']/i,
      /episode.*?id["\s:]+(\d+)/i,
      /sources\?id=(\d+)/i,
    ];
    
    let episodeSourceId: string | null = null;
    
    for (const pattern of episodeIdPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        episodeSourceId = match[1];
        console.log(`Found episode source ID: ${episodeSourceId} (pattern matched)`);
        break;
      }
    }
    
    if (!episodeSourceId) {
      console.warn('Could not extract episode source ID from HTML');
      console.log('HTML preview:', html.substring(0, 1000));
      // Fall back to old parsing method
      return parseAniwatchSources(html, episodeUrl);
    }
    
    // Step 3: Call the AJAX API to get the iframe link
    console.log(`Calling AniWatch API: /ajax/v2/episode/sources?id=${episodeSourceId}`);
    
    const apiUrl = `${ANIWATCH_BASE_URL}/ajax/v2/episode/sources?id=${episodeSourceId}`;
    const apiResponse = await fetchWithCache(apiUrl);
    
    console.log('API Response:', apiResponse.substring(0, 500));
    
    // Parse JSON response
    const data = JSON.parse(apiResponse);
    
    const sources: AniwatchStreamSource[] = [];
    
    // The API returns an iframe link
    if (data.link) {
      console.log('Found iframe link:', data.link);
      sources.push({
        url: data.link,
        quality: 'Default',
        type: 'iframe',
      });
    }
    
    // Sometimes sources might be in the response
    if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
      console.log('Found direct sources in API response:', data.sources.length);
      data.sources.forEach((source: any) => {
        sources.push({
          url: source.file || source.url,
          quality: source.label || source.quality || 'Default',
          type: source.type || (source.file?.includes('.m3u8') ? 'hls' : 'mp4'),
        });
      });
    }
    
    console.log(`Found ${sources.length} streaming sources from API`);
    
    // If we got an iframe, optionally fetch and parse it for direct video URLs
    if (sources.length > 0 && sources[0].type === 'iframe') {
      console.log('Got iframe, attempting to extract direct video sources...');
      try {
        const iframeHtml = await fetchWithCache(sources[0].url);
        const iframeSources = parseIframeForVideoSources(iframeHtml);
        
        if (iframeSources.length > 0) {
          console.log(`Extracted ${iframeSources.length} direct sources from iframe`);
          sources.push(...iframeSources);
        }
      } catch (err) {
        console.warn('Could not parse iframe:', err);
        // Keep the iframe URL as fallback
      }
    }
    
    return sources;
  } catch (error) {
    console.error('Error fetching stream sources:', error);
    return [];
  }
};

/**
 * Parse iframe content for direct video sources
 */
const parseIframeForVideoSources = (iframeHtml: string): AniwatchStreamSource[] => {
  const sources: AniwatchStreamSource[] = [];
  
  try {
    console.log('Parsing iframe HTML for video sources...');
    console.log('Iframe HTML length:', iframeHtml.length);
    
    // Look for video URLs in various formats
    const patterns = [
      // Direct m3u8/mp4 URLs
      /(https?:\/\/[^\s"'<>()]+\.m3u8(?:\?[^\s"'<>()]*)?)/gi,
      /(https?:\/\/[^\s"'<>()]+\.mp4(?:\?[^\s"'<>()]*)?)/gi,
      
      // JSON source arrays
      /sources?\s*:\s*\[\s*\{\s*[^}]*file\s*:\s*["']([^"']+)["']/gi,
      /sources?\s*:\s*\[?\s*["']([^"']+\.(?:m3u8|mp4))["']/gi,
      
      // Common video player variables
      /(?:file|src|source|url)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi,
      
      // Playlist/master URLs
      /["']([^"']*\/playlist\.m3u8[^"']*)["']/gi,
      /["']([^"']*\/master\.m3u8[^"']*)["']/gi,
    ];
    
    patterns.forEach((pattern, idx) => {
      let match;
      while ((match = pattern.exec(iframeHtml)) !== null) {
        const videoUrl = match[1];
        
        // Skip if it's clearly not a video URL
        if (videoUrl.includes('thumb') || videoUrl.includes('poster') || 
            videoUrl.includes('preview') || videoUrl.length < 10) {
          continue;
        }
        
        const isM3U8 = videoUrl.includes('.m3u8');
        console.log(`Found video in iframe (pattern ${idx + 1}):`, videoUrl.substring(0, 100));
        
        sources.push({
          url: videoUrl,
          quality: isM3U8 ? 'HLS' : 'MP4',
          type: isM3U8 ? 'hls' : 'mp4',
        });
      }
    });
    
    // Remove duplicates
    const uniqueSources = sources.filter((source, index, self) =>
      index === self.findIndex((s) => s.url === source.url)
    );
    
    console.log(`Extracted ${uniqueSources.length} unique sources from iframe`);
    return uniqueSources;
  } catch (error) {
    console.error('Error parsing iframe:', error);
    return [];
  }
};

/**
 * Parse video sources from episode page (fallback method)
 */
const parseAniwatchSources = (html: string, episodeUrl: string): AniwatchStreamSource[] => {
  const sources: AniwatchStreamSource[] = [];
  
  try {
    console.log('Parsing video sources from HTML...');
    
    // AniWatch typically uses iframe embeds or has video sources in JavaScript
    
    // 1. Look for iframe embeds (any iframe, not just specific IDs)
    const iframeRegex = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;
    let iframeCount = 0;
    
    while ((match = iframeRegex.exec(html)) !== null) {
      const iframeUrl = match[1];
      iframeCount++;
      console.log(`Found iframe ${iframeCount}:`, iframeUrl.substring(0, 100));
      
      sources.push({
        url: iframeUrl.startsWith('http') ? iframeUrl : `${ANIWATCH_BASE_URL}${iframeUrl}`,
        quality: 'Default',
        type: 'iframe',
      });
    }
    
    // 2. Look for video URLs in JavaScript (multiple patterns)
    const jsPatterns = [
      /["']file["']\s*:\s*["']([^"']+\.(?:m3u8|mp4))["']/gi,
      /["']src["']\s*:\s*["']([^"']+\.(?:m3u8|mp4))["']/gi,
      /["']source["']\s*:\s*["']([^"']+\.(?:m3u8|mp4))["']/gi,
      /sources?\s*:\s*\[?\s*["']([^"']+\.(?:m3u8|mp4))["']/gi,
      /(https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4))/gi,
    ];
    
    jsPatterns.forEach((pattern, idx) => {
      let patternMatch;
      while ((patternMatch = pattern.exec(html)) !== null) {
        const videoUrl = patternMatch[1];
        const isM3U8 = videoUrl.includes('.m3u8');
        console.log(`Found video URL (pattern ${idx + 1}):`, videoUrl.substring(0, 100));
        
        sources.push({
          url: videoUrl,
          quality: isM3U8 ? 'HLS' : 'MP4',
          type: isM3U8 ? 'hls' : 'mp4',
        });
      }
    });
    
    // 3. Look for data attributes
    const dataPatterns = [
      /data-video=["']([^"']+)["']/gi,
      /data-src=["']([^"']+\.(?:m3u8|mp4))["']/gi,
      /data-url=["']([^"']+\.(?:m3u8|mp4))["']/gi,
    ];
    
    dataPatterns.forEach((pattern) => {
      let patternMatch;
      while ((patternMatch = pattern.exec(html)) !== null) {
        const videoUrl = patternMatch[1];
        console.log('Found data attribute:', videoUrl.substring(0, 100));
        
        sources.push({
          url: videoUrl,
          quality: 'Default',
          type: videoUrl.includes('.m3u8') ? 'hls' : 'mp4',
        });
      }
    });
    
    // 4. Look for server selection data (data-id)
    const serverRegex = /data-id=["']([^"']+)["'][^>]*(?:data-type=["']([^"']+)["'])?/gi;
    
    while ((match = serverRegex.exec(html)) !== null) {
      const serverId = match[1];
      const serverType = match[2] || 'unknown';
      console.log('Found server ID:', serverId, 'Type:', serverType);
      
      sources.push({
        url: `${ANIWATCH_BASE_URL}/ajax/server/${serverId}`,
        quality: serverType.toUpperCase(),
        type: 'api',
      });
    }
    
    // 5. Look for embed URLs
    const embedRegex = /\/embed\/([^"'\s<>]+)/gi;
    
    while ((match = embedRegex.exec(html)) !== null) {
      const embedId = match[1];
      console.log('Found embed ID:', embedId);
      
      sources.push({
        url: `${ANIWATCH_BASE_URL}/embed/${embedId}`,
        quality: 'Embed',
        type: 'iframe',
      });
    }
    
    console.log(`Total sources found before filtering: ${sources.length}`);
  } catch (error) {
    console.error('Error parsing video sources:', error);
  }
  
  // Remove duplicates
  const uniqueSources = sources.filter((source, index, self) =>
    index === self.findIndex((s) => s.url === source.url)
  );
  
  console.log(`Unique sources: ${uniqueSources.length}`);
  uniqueSources.forEach((s, i) => {
    console.log(`Source ${i + 1}: ${s.type} - ${s.quality} - ${s.url.substring(0, 80)}`);
  });
  
  return uniqueSources;
};

/**
 * Try alternative methods to extract video sources
 */
const tryAlternativeSourcExtraction = async (html: string, episodeUrl: string): Promise<AniwatchStreamSource[]> => {
  const sources: AniwatchStreamSource[] = [];
  
  try {
    console.log('Trying alternative source extraction methods...');
    
    // Method 1: Create a mock source using the episode URL as an embed
    // This can work if AniWatch uses internal embedding
    const urlParts = episodeUrl.split('?');
    if (urlParts.length > 0) {
      const baseUrl = urlParts[0];
      const episodeParam = urlParts[1];
      
      // Try creating embed URL
      const embedUrl = baseUrl.replace('/watch/', '/embed/');
      if (episodeParam) {
        sources.push({
          url: `${embedUrl}?${episodeParam}`,
          quality: 'Auto',
          type: 'iframe',
        });
      }
      
      console.log('Added fallback embed URL:', embedUrl);
    }
    
    // Method 2: Look for any .m3u8 or .mp4 URLs anywhere in the HTML
    // This is a very broad search as a last resort
    const broadVideoRegex = /(https?:\/\/[^\s"'<>()]+\.(?:m3u8|mp4)(?:\?[^\s"'<>()]*)?)/gi;
    let match;
    
    while ((match = broadVideoRegex.exec(html)) !== null) {
      const videoUrl = match[1];
      const isM3U8 = videoUrl.includes('.m3u8');
      
      // Skip if URL looks like a thumbnail or image
      if (videoUrl.includes('/thumb') || videoUrl.includes('/poster') || videoUrl.includes('/cover')) {
        continue;
      }
      
      console.log('Found broad video URL:', videoUrl.substring(0, 100));
      
      sources.push({
        url: videoUrl,
        quality: isM3U8 ? 'HLS' : 'Direct',
        type: isM3U8 ? 'hls' : 'mp4',
      });
    }
    
    // Method 3: Look for script tags that might contain video data
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    let scriptCount = 0;
    
    while ((scriptMatch = scriptRegex.exec(html)) !== null && scriptCount < 10) {
      const scriptContent = scriptMatch[1];
      scriptCount++;
      
      // Look for potential video URLs in the script
      const videoInScript = scriptContent.match(/(https?:\/\/[^\s"']+\.(?:m3u8|mp4))/i);
      if (videoInScript) {
        console.log(`Found video in script ${scriptCount}:`, videoInScript[1].substring(0, 100));
        
        sources.push({
          url: videoInScript[1],
          quality: videoInScript[1].includes('.m3u8') ? 'HLS' : 'MP4',
          type: videoInScript[1].includes('.m3u8') ? 'hls' : 'mp4',
        });
      }
    }
    
    console.log(`Alternative methods found ${sources.length} sources`);
  } catch (error) {
    console.error('Error in alternative source extraction:', error);
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
export const getAniwatchPopular = async (): Promise<AniwatchAnime[]> => {
  try {
    console.log('Fetching popular anime from AniWatch');
    
    const html = await fetchWithCache(`${ANIWATCH_BASE_URL}/home`);
    
    return parseAniwatchSearch(html);
  } catch (error) {
    console.error('Error fetching popular anime:', error);
    return [];
  }
};

/**
 * Get trending anime
 */
export const getAniwatchTrending = async (): Promise<AniwatchAnime[]> => {
  try {
    console.log('Fetching trending anime from AniWatch');
    
    const html = await fetchWithCache(`${ANIWATCH_BASE_URL}/home`);
    
    // Parse trending section (usually separate from popular)
    return parseAniwatchSearch(html);
  } catch (error) {
    console.error('Error fetching trending anime:', error);
    return [];
  }
};

/**
 * Get anime by genre
 */
export const getAniwatchByGenre = async (genre: string): Promise<AniwatchAnime[]> => {
  try {
    console.log(`Fetching ${genre} anime from AniWatch`);
    
    const html = await fetchWithCache(`${ANIWATCH_BASE_URL}/genre/${genre.toLowerCase()}`);
    
    return parseAniwatchSearch(html);
  } catch (error) {
    console.error(`Error fetching ${genre} anime:`, error);
    return [];
  }
};

/**
 * Get home page data
 */
export const getAniwatchHome = async (): Promise<{
  popular: AniwatchAnime[];
  trending: AniwatchAnime[];
}> => {
  try {
    console.log('Fetching AniWatch home page');
    
    const [popular, trending] = await Promise.all([
      getAniwatchPopular().catch(() => []),
      getAniwatchTrending().catch(() => []),
    ]);
    
    return { popular, trending };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return { popular: [], trending: [] };
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

export const aniwatchRateLimiter = new ScrapingRateLimiter();

