import axios, { type AxiosInstance } from 'axios';
import { HiAnime } from 'aniwatch';

type EpisodeCategory = 'sub' | 'dub' | 'raw';
type ProviderMode = 'api' | 'package' | 'itzzzme-api';

const DEFAULT_API_URL = 'http://localhost:4000';
const DEFAULT_API_BASE_PATH = '/api/v2/hianime';
const DEFAULT_ITZZZME_API_URL = 'http://localhost:3000';
const DEFAULT_ITZZZME_API_BASE_PATH = '/api';
const DEFAULT_TIMEOUT_MS = 12000;

const packageClient = new HiAnime.Scraper();
const provider = ((process.env.ANIWATCH_PROVIDER || 'api').toLowerCase() as ProviderMode);
const shouldUseApiProvider = provider === 'api';
const shouldUseItzzzmeProvider = provider === 'itzzzme-api';
const shouldFallbackToPackage = process.env.ANIWATCH_API_FALLBACK_TO_PACKAGE !== 'false';

const apiBaseUrl = (process.env.ANIWATCH_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
const apiBasePath = process.env.ANIWATCH_API_BASE_PATH || DEFAULT_API_BASE_PATH;
const itzzzmeApiBaseUrl = (process.env.ITZZZME_API_URL || DEFAULT_ITZZZME_API_URL).replace(/\/+$/, '');
const itzzzmeApiBasePath = process.env.ITZZZME_API_BASE_PATH || DEFAULT_ITZZZME_API_BASE_PATH;
const apiTimeoutMs = Number(process.env.ANIWATCH_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

const apiClient: AxiosInstance = axios.create({
  baseURL: `${apiBaseUrl}${apiBasePath}`,
  timeout: apiTimeoutMs,
});

const itzzzmeApiClient: AxiosInstance = axios.create({
  baseURL: `${itzzzmeApiBaseUrl}${itzzzmeApiBasePath}`,
  timeout: apiTimeoutMs,
});

function unwrapResponseData<T>(payload: any): T {
  if (payload?.data?.success && payload.data.data !== undefined) {
    return payload.data.data as T;
  }
  if (payload?.data?.data !== undefined) {
    return payload.data.data as T;
  }
  return (payload?.data ?? payload) as T;
}

function logApiFallback(method: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`aniwatch-api ${method} failed, falling back to aniwatch package: ${message}`);
}

function mapAnimeCard(anime: any): any {
  if (!anime || typeof anime !== 'object') {
    return anime;
  }

  return {
    ...anime,
    id: anime.id || anime.animeId || anime.slug || anime.key || '',
    name: anime.name || anime.title || anime.animeTitle || '',
    title: anime.title || anime.name || anime.animeTitle || '',
    poster: anime.poster || anime.image || anime.cover || anime.thumbnail || '',
    type: anime.type || anime.format || anime.animeType,
    rating: anime.rating || anime.score || anime.malScore,
  };
}

function normalizeAnimesPayload(payload: any): { animes: any[] } {
  if (Array.isArray(payload)) {
    return { animes: payload.map(mapAnimeCard) };
  }

  const list =
    payload?.animes ||
    payload?.results ||
    payload?.items ||
    payload?.data ||
    payload?.list ||
    [];

  return { animes: Array.isArray(list) ? list.map(mapAnimeCard) : [] };
}

function normalizeInfoPayload(payload: any): any {
  const animeRoot = payload?.anime || payload?.info || payload;
  const info = animeRoot?.info || animeRoot;
  const normalizedInfo = mapAnimeCard(info);

  const moreInfo = animeRoot?.moreInfo || payload?.moreInfo || {};
  const relatedAnimes = payload?.relatedAnimes || payload?.relatedAnime || animeRoot?.relatedAnimes || [];
  const recommendedAnimes =
    payload?.recommendedAnimes || payload?.recommendations || animeRoot?.recommendedAnimes || [];
  const charactersVoiceActors =
    payload?.charactersVoiceActors || animeRoot?.charactersVoiceActors || payload?.characters || [];

  return {
    ...payload,
    anime: {
      ...animeRoot,
      info: {
        ...normalizedInfo,
        stats: normalizedInfo.stats || animeRoot?.stats || info?.stats || {},
      },
      moreInfo,
    },
    relatedAnimes,
    recommendedAnimes,
    charactersVoiceActors,
  };
}

function normalizeEpisodesPayload(payload: any, animeId: string): { episodes: any[] } {
  const list = Array.isArray(payload)
    ? payload
    : payload?.episodes || payload?.data || payload?.results || payload?.items || [];

  return {
    episodes: (Array.isArray(list) ? list : []).map((ep: any, index: number) => {
      const number = Number(ep?.number || ep?.episodeNumber || ep?.episode || index + 1);
      const id = ep?.episodeId || ep?.id || `${animeId}?ep=${number}`;
      return {
        ...ep,
        episodeId: id,
        id,
        number,
        title: ep?.title || ep?.name || `Episode ${number}`,
      };
    }),
  };
}

function normalizeServersPayload(payload: any): { sub: any[]; dub: any[] } {
  const base = payload?.servers || payload;
  const asList = Array.isArray(base)
    ? base
    : [
        ...(Array.isArray(base?.sub) ? base.sub : []),
        ...(Array.isArray(base?.dub) ? base.dub : []),
      ];

  const normalized = (Array.isArray(asList) ? asList : []).map((server: any) => ({
    ...server,
    serverId: server?.serverId || server?.id || server?.server || server?.name || '',
    serverName: server?.serverName || server?.name || server?.server || server?.id || '',
    category: (server?.category || server?.type || 'sub').toString().toLowerCase(),
  }));

  return {
    sub: normalized.filter((s: any) => s.category !== 'dub'),
    dub: normalized.filter((s: any) => s.category === 'dub'),
  };
}

function normalizeSourcesPayload(payload: any): any {
  const sources = payload?.sources || payload?.data?.sources || [];
  const tracks = payload?.tracks || payload?.subtitles || payload?.captions || [];

  return {
    ...payload,
    sources: (Array.isArray(sources) ? sources : []).map((source: any) => ({
      ...source,
      url: source?.url || source?.file || source?.src || '',
      file: source?.file || source?.url || source?.src || '',
      quality: source?.quality || source?.label || 'auto',
      type: source?.type || (String(source?.url || source?.file || '').includes('.m3u8') ? 'hls' : source?.type),
    })),
    tracks: (Array.isArray(tracks) ? tracks : []).map((track: any) => ({
      ...track,
      url: track?.url || track?.file || '',
      file: track?.file || track?.url || '',
      lang: track?.lang || track?.label || track?.language || 'Unknown',
      label: track?.label || track?.lang || track?.language || 'Unknown',
    })),
    embedURL: payload?.embedURL || payload?.embedUrl || payload?.link || payload?.iframe || undefined,
  };
}

function parseEpisodeReference(episodeId: string): { animeId: string; episodeNumber: string } {
  const [animeIdPart, query = ''] = episodeId.split('?');
  const params = new URLSearchParams(query);
  const episodeNumber = params.get('ep') || params.get('episode') || '';

  return { animeId: animeIdPart || episodeId, episodeNumber };
}

async function callItzzzmeServers(episodeId: string): Promise<any> {
  const { animeId, episodeNumber } = parseEpisodeReference(episodeId);

  const attempts: Array<() => Promise<any>> = [];

  if (episodeNumber) {
    attempts.push(() => itzzzmeApiClient.get(`/servers/${encodeURIComponent(animeId)}`, { params: { ep: episodeNumber } }));
  }

  attempts.push(() => itzzzmeApiClient.get('/servers', { params: { id: animeId, ep: episodeNumber || undefined } }));
  attempts.push(() => itzzzmeApiClient.get(`/servers/${encodeURIComponent(episodeId)}`));

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return unwrapResponseData(await attempt());
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to fetch episode servers from itzzzme api');
}

async function withProviderFallback<T>(
  methodName: string,
  upstreamCall: () => Promise<T>,
  packageCall: () => Promise<T>
): Promise<T> {
  if (shouldUseApiProvider || shouldUseItzzzmeProvider) {
    try {
      return await upstreamCall();
    } catch (error) {
      if (!shouldFallbackToPackage) {
        throw error;
      }
      logApiFallback(methodName, error);
      return packageCall();
    }
  }

  return packageCall();
}

export async function searchAnimeProvider(
  query: string,
  page: number,
  filters?: Record<string, string>
): Promise<any> {
  return withProviderFallback(
    'search',
    async () => {
      if (shouldUseItzzzmeProvider) {
        const response = await itzzzmeApiClient.get('/search', {
          params: {
            keyword: query,
            q: query,
            page,
            ...(filters || {}),
          },
        });
        return normalizeAnimesPayload(unwrapResponseData<any>(response));
      }

      const response = await apiClient.get('/search', {
        params: {
          q: query,
          page,
          ...(filters || {}),
        },
      });
      return unwrapResponseData<any>(response);
    },
    async () => packageClient.search(query, page, filters || {})
  );
}

export async function getAnimeInfoProvider(animeId: string): Promise<any> {
  return withProviderFallback(
    'anime info',
    async () => {
      if (shouldUseItzzzmeProvider) {
        const response = await itzzzmeApiClient.get('/info', {
          params: { id: animeId },
        });
        return normalizeInfoPayload(unwrapResponseData<any>(response));
      }

      const response = await apiClient.get(`/anime/${encodeURIComponent(animeId)}`);
      return unwrapResponseData<any>(response);
    },
    async () => packageClient.getInfo(animeId)
  );
}

export async function getAnimeEpisodesProvider(animeId: string): Promise<any> {
  return withProviderFallback(
    'anime episodes',
    async () => {
      if (shouldUseItzzzmeProvider) {
        const response = await itzzzmeApiClient.get(`/episodes/${encodeURIComponent(animeId)}`);
        return normalizeEpisodesPayload(unwrapResponseData<any>(response), animeId);
      }

      const response = await apiClient.get(`/anime/${encodeURIComponent(animeId)}/episodes`);
      return unwrapResponseData<any>(response);
    },
    async () => packageClient.getEpisodes(animeId)
  );
}

export async function getHomePageProvider(): Promise<any> {
  return withProviderFallback(
    'home',
    async () => {
      if (shouldUseItzzzmeProvider) {
        const response = await itzzzmeApiClient.get('/');
        const data = unwrapResponseData<any>(response);
        return {
          spotlightAnimes: normalizeAnimesPayload(data?.spotlightAnimes || data?.spotlight || []).animes,
          trendingAnimes: normalizeAnimesPayload(data?.trendingAnimes || data?.trending || []).animes,
          latestEpisodeAnimes: normalizeAnimesPayload(data?.latestEpisodeAnimes || data?.latest || []).animes,
          topAiringAnimes: normalizeAnimesPayload(data?.topAiringAnimes || data?.topAiring || []).animes,
          mostPopularAnimes: normalizeAnimesPayload(data?.mostPopularAnimes || data?.mostPopular || []).animes,
        };
      }

      const response = await apiClient.get('/home');
      return unwrapResponseData<any>(response);
    },
    async () => packageClient.getHomePage()
  );
}

export async function getCategoryAnimeProvider(category: string, page: number): Promise<any> {
  return withProviderFallback(
    'category',
    async () => {
      if (shouldUseItzzzmeProvider) {
        const response = await itzzzmeApiClient.get(`/category/${encodeURIComponent(category)}`, {
          params: { page },
        });
        return normalizeAnimesPayload(unwrapResponseData<any>(response));
      }

      const response = await apiClient.get(`/category/${encodeURIComponent(category)}`, {
        params: { page },
      });
      return unwrapResponseData<any>(response);
    },
    async () => packageClient.getCategoryAnime(category as any, page)
  );
}

export async function getGenreAnimeProvider(genre: string, page: number): Promise<any> {
  return withProviderFallback(
    'genre',
    async () => {
      if (shouldUseItzzzmeProvider) {
        const response = await itzzzmeApiClient.get(`/genre/${encodeURIComponent(genre)}`, {
          params: { page },
        });
        return normalizeAnimesPayload(unwrapResponseData<any>(response));
      }

      const response = await apiClient.get(`/genre/${encodeURIComponent(genre)}`, {
        params: { page },
      });
      return unwrapResponseData<any>(response);
    },
    async () => packageClient.getGenreAnime(genre, page)
  );
}

export async function getAZAnimeProvider(letter: string, page: number): Promise<any> {
  return withProviderFallback(
    'azlist',
    async () => {
      if (shouldUseItzzzmeProvider) {
        const response = await itzzzmeApiClient.get(`/azlist/${encodeURIComponent(letter)}`, {
          params: { page },
        });
        return normalizeAnimesPayload(unwrapResponseData<any>(response));
      }

      const response = await apiClient.get(`/azlist/${encodeURIComponent(letter)}`, {
        params: { page },
      });
      return unwrapResponseData<any>(response);
    },
    async () => packageClient.getAZList(letter as any, page)
  );
}

export async function getEpisodeServersProvider(episodeId: string): Promise<any> {
  return withProviderFallback(
    'episode servers',
    async () => {
      if (shouldUseItzzzmeProvider) {
        const payload = await callItzzzmeServers(episodeId);
        return normalizeServersPayload(payload);
      }

      const response = await apiClient.get('/episode/servers', {
        params: { animeEpisodeId: episodeId },
      });
      return unwrapResponseData<any>(response);
    },
    async () => packageClient.getEpisodeServers(episodeId)
  );
}

export async function getEpisodeSourcesProvider(
  episodeId: string,
  server: string,
  category: EpisodeCategory
): Promise<any> {
  return withProviderFallback(
    'episode sources',
    async () => {
      if (shouldUseItzzzmeProvider) {
        const { animeId, episodeNumber } = parseEpisodeReference(episodeId);
        const response = await itzzzmeApiClient.get('/stream', {
          params: {
            id: episodeNumber ? `${animeId}?ep=${episodeNumber}` : episodeId,
            server,
            type: category,
          },
        });
        return normalizeSourcesPayload(unwrapResponseData<any>(response));
      }

      const response = await apiClient.get('/episode/sources', {
        params: {
          animeEpisodeId: episodeId,
          server,
          category,
        },
      });
      return unwrapResponseData<any>(response);
    },
    async () => packageClient.getEpisodeSources(episodeId, server as any, category)
  );
}
