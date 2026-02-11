import { HiAnime } from 'aniwatch';
import axios from 'axios';

const aniwatch = new HiAnime.Scraper();

// Fallback API endpoints (consumet-based APIs)
const FALLBACK_APIS = [
  'https://api.consumet.org/anime/zoro',
  'https://consumet-api.vercel.app/anime/zoro',
];

export interface StreamingSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface StreamingData {
  sources: StreamingSource[];
  headers?: Record<string, string>;
  tracks?: Array<{ url: string; lang: string }>;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  embedURL?: string;
}

export interface Server {
  id: string;
  name: string;
  category?: string;
}

/**
 * Get episode streaming sources
 */
export async function getEpisodeSources(
  episodeId: string,
  server: string = 'hd-1',
  category: 'sub' | 'dub' | 'raw' = 'sub'
): Promise<StreamingData> {
  try {
    console.log('Fetching episode sources:', { episodeId, server, category });
    
    // The episodeId should be in format: {animeId}?ep={episodeNumber}
    // Frontend should construct this, but we'll handle it here as fallback
    let finalEpisodeId = episodeId;
    
    // If episodeId doesn't contain ?ep=, try to construct it
    if (!episodeId.includes('?ep=')) {
      // Try to extract episode number from the end if it's in format like "anime-id-ep-1"
      const epMatch = episodeId.match(/-ep-(\d+)$/);
      if (epMatch) {
        const epNumber = epMatch[1];
        const cleanAnimeId = episodeId.replace(/-ep-\d+$/, '');
        finalEpisodeId = `${cleanAnimeId}?ep=${epNumber}`;
      } else {
        // If no episode number found, assume it's episode 1
        const cleanAnimeId = episodeId.includes('?') ? episodeId.split('?')[0] : episodeId;
        finalEpisodeId = `${cleanAnimeId}?ep=1`;
      }
    }
    
    console.log('Using episodeId format:', finalEpisodeId);
    
    let data;
    try {
      data = await aniwatch.getEpisodeSources(finalEpisodeId, server as any, category);
    } catch (aniwatchError: any) {
      console.error('Aniwatch package error:', aniwatchError);
      console.error('Error details:', {
        message: aniwatchError.message,
        stack: aniwatchError.stack,
        episodeId: finalEpisodeId,
        server,
        category
      });
      throw new Error(`Aniwatch error: ${aniwatchError.message || 'Unknown error'}`);
    }

    if (!data) {
      console.warn('No data returned from aniwatch.getEpisodeSources');
      return { sources: [] };
    }

    if (!data.sources || !Array.isArray(data.sources) || data.sources.length === 0) {
      console.warn('No sources found in data:', data);
      return { sources: [] };
    }

    const sources: StreamingSource[] = data.sources.map((source: any) => ({
      url: source.url || source.file || '',
      quality: source.quality || source.label || 'auto',
      isM3U8: (source.url?.includes('.m3u8') || source.type === 'hls' || source.url?.includes('m3u8')) || false,
    })).filter((source: StreamingSource) => source.url); // Filter out empty URLs

    if (sources.length === 0) {
      console.warn('No valid sources after mapping');
      return { sources: [] };
    }

    const result: StreamingData = {
      sources,
      headers: data.headers || { Referer: 'https://hianime.to/' },
    };

    if (data.subtitles && Array.isArray(data.subtitles)) {
      result.tracks = data.subtitles.map((sub: any) => ({
        url: sub.url || '',
        lang: sub.lang || 'Unknown',
      })).filter((track: any) => track.url);
    }

    if ((data as any).intro) {
      result.intro = (data as any).intro;
    }

    if ((data as any).outro) {
      result.outro = (data as any).outro;
    }

    // Include embed URL for iframe fallback
    if ((data as any).embedURL) {
      result.embedURL = (data as any).embedURL;
      console.log('Embed URL available:', result.embedURL);
    }

    console.log('Successfully fetched sources:', sources.length);
    return result;
  } catch (error: any) {
    console.error('Error in getEpisodeSources:', error.message);

    // Try fallback APIs
    console.log('Trying fallback APIs...');
    const fallbackResult = await tryFallbackApis(episodeId, server, category);
    if (fallbackResult && fallbackResult.sources.length > 0) {
      return fallbackResult;
    }

    throw new Error(error.message || 'Failed to get episode sources');
  }
}

/**
 * Try fallback consumet APIs when aniwatch fails
 */
async function tryFallbackApis(
  episodeId: string,
  server: string,
  category: 'sub' | 'dub' | 'raw'
): Promise<StreamingData | null> {
  // Extract anime ID and episode number from episodeId
  // Format: anime-id?ep=123
  const match = episodeId.match(/^(.+)\?ep=(\d+)$/);
  if (!match) {
    console.log('Could not parse episode ID for fallback:', episodeId);
    return null;
  }

  const [, animeId, epNumber] = match;

  for (const baseUrl of FALLBACK_APIS) {
    try {
      console.log(`Trying fallback API: ${baseUrl}`);

      // First get episode list to find episode ID
      const infoUrl = `${baseUrl}/info?id=${animeId}`;
      const infoRes = await axios.get(infoUrl, { timeout: 10000 });

      if (!infoRes.data?.episodes) {
        continue;
      }

      // Find the episode
      const episode = infoRes.data.episodes.find((ep: any) =>
        ep.number === parseInt(epNumber) || ep.number === epNumber
      );

      if (!episode?.id) {
        console.log(`Episode ${epNumber} not found in API response`);
        continue;
      }

      // Get sources for the episode
      const sourcesUrl = `${baseUrl}/watch?episodeId=${episode.id}&server=${server}`;
      const sourcesRes = await axios.get(sourcesUrl, { timeout: 10000 });

      if (sourcesRes.data?.sources && sourcesRes.data.sources.length > 0) {
        console.log(`Fallback API success: ${sourcesRes.data.sources.length} sources`);

        const sources: StreamingSource[] = sourcesRes.data.sources.map((source: any) => ({
          url: source.url || '',
          quality: source.quality || 'auto',
          isM3U8: source.isM3U8 ?? source.url?.includes('.m3u8') ?? false,
        })).filter((s: StreamingSource) => s.url);

        const result: StreamingData = {
          sources,
          headers: sourcesRes.data.headers || { Referer: 'https://hianime.to/' },
        };

        if (sourcesRes.data.subtitles) {
          result.tracks = sourcesRes.data.subtitles.map((sub: any) => ({
            url: sub.url || '',
            lang: sub.lang || 'Unknown',
          })).filter((t: any) => t.url);
        }

        return result;
      }
    } catch (err: any) {
      console.log(`Fallback API ${baseUrl} failed:`, err.message);
    }
  }

  return null;
}

/**
 * Get available episode servers
 */
export async function getEpisodeServers(episodeId: string): Promise<Server[]> {
  const servers = await aniwatch.getEpisodeServers(episodeId);

  if (!servers) {
    return [];
  }

  const result: Server[] = [];

  if (Array.isArray(servers.sub)) {
    servers.sub.forEach((server: any) => {
      result.push({
        id: server.serverId || server.id || server.serverName || '',
        name: server.serverName || server.name || '',
        category: 'sub',
      });
    });
  }

  if (Array.isArray(servers.dub)) {
    servers.dub.forEach((server: any) => {
      result.push({
        id: server.serverId || server.id || server.serverName || '',
        name: server.serverName || server.name || '',
        category: 'dub',
      });
    });
  }

  return result;
}
