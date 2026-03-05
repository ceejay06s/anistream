import {
  getEpisodeSourcesProvider,
  getEpisodeServersProvider,
} from './aniwatchApiClient.js';

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
  let finalEpisodeId = episodeId;
  try {
    console.log('Fetching episode sources:', { episodeId, server, category });

    // The episodeId should be in format: {animeId}?ep={episodeNumber}
    // Frontend should construct this, but we'll handle it here as fallback

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
      data = await getEpisodeSourcesProvider(finalEpisodeId, server, category);
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

    if (!data || !data.sources || !Array.isArray(data.sources) || data.sources.length === 0) {
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

    // Check for subtitles/tracks - aniwatch may return them under different property names
    const subtitleData = data.subtitles || (data as any).tracks || (data as any).captions || [];
    if (Array.isArray(subtitleData) && subtitleData.length > 0) {
      result.tracks = subtitleData
        .filter((sub: any) => {
          // Filter out thumbnail tracks (keep only actual subtitles)
          const kind = (sub.kind || '').toLowerCase();
          const label = (sub.label || '').toLowerCase();
          const lang = (sub.lang || '').toLowerCase();

          if (kind === 'thumbnails' || kind === 'thumbnail') return false;
          if (label === 'thumbnails' || label === 'thumbnail') return false;
          if (lang === 'thumbnails' || lang === 'thumbnail') return false;

          return true;
        })
        .map((sub: any) => ({
          url: sub.url || sub.file || '',
          lang: sub.lang || sub.label || sub.language || 'Unknown',
        }))
        .filter((track: any) => track.url);
      console.log('Found subtitles/tracks:', result.tracks?.length || 0);
    }

    if ((data as any).intro) {
      result.intro = (data as any).intro;
    }

    if ((data as any).outro) {
      result.outro = (data as any).outro;
    }

    if ((data as any).embedURL) {
      result.embedURL = (data as any).embedURL;
      console.log('Embed URL available:', result.embedURL);
    }

    console.log('Successfully fetched sources:', sources.length);
    return result;
  } catch (error: any) {
    console.error('Error in getEpisodeSources:', error.message);
    throw new Error(error.message || 'Failed to get episode sources');
  }
}

export interface ParallelSourcesResult {
  server: string;
  data: StreamingData;
}

/** Max servers to query at once (avoids flooding upstream). Env: STREAMING_PARALLEL_CONCURRENCY, default 3. */
const MAX_PARALLEL_CONCURRENCY = Math.max(1, Math.min(5, parseInt(process.env.STREAMING_PARALLEL_CONCURRENCY || '3', 10) || 3));

/** Delay in ms between batches when using parallel (spread load). Env: STREAMING_PARALLEL_BATCH_DELAY_MS, default 200. */
const PARALLEL_BATCH_DELAY_MS = Math.max(0, parseInt(process.env.STREAMING_PARALLEL_BATCH_DELAY_MS || '200', 10) || 200);

/**
 * Fetch sources from multiple servers in parallel batches; returns the first
 * successful result (by server order). Caps concurrency to avoid flooding
 * upstream (e.g. 3 at a time, then next batch if needed).
 */
export async function getEpisodeSourcesParallel(
  episodeId: string,
  servers: string[],
  category: 'sub' | 'dub' | 'raw'
): Promise<ParallelSourcesResult | null> {
  if (servers.length === 0) return null;

  for (let offset = 0; offset < servers.length; offset += MAX_PARALLEL_CONCURRENCY) {
    const batch = servers.slice(offset, offset + MAX_PARALLEL_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((server) =>
        getEpisodeSources(episodeId, server, category).then((data) => ({ server, data }))
      )
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && r.value?.data?.sources?.length) {
        const { server, data } = r.value;
        console.log(`Parallel: working stream from server: ${server} (${data.sources.length} sources)`);
        return { server, data };
      }
    }

    if (offset + MAX_PARALLEL_CONCURRENCY < servers.length && PARALLEL_BATCH_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, PARALLEL_BATCH_DELAY_MS));
    }
  }

  return null;
}

/**
 * Get available episode servers
 */
export async function getEpisodeServers(episodeId: string): Promise<Server[]> {
  const servers = await getEpisodeServersProvider(episodeId);

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
