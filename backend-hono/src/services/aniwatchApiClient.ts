import axios, { type AxiosInstance } from 'axios';
import { HiAnime } from 'aniwatch';

type EpisodeCategory = 'sub' | 'dub' | 'raw';

const DEFAULT_API_URL = 'http://localhost:4000';
const DEFAULT_API_BASE_PATH = '/api/v2/hianime';
const DEFAULT_TIMEOUT_MS = 12000;

const packageClient = new HiAnime.Scraper();
const provider = (process.env.ANIWATCH_PROVIDER || 'api').toLowerCase();
const shouldUseApiProvider = provider !== 'package';
const shouldFallbackToPackage = process.env.ANIWATCH_API_FALLBACK_TO_PACKAGE !== 'false';

const apiBaseUrl = (process.env.ANIWATCH_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
const apiBasePath = process.env.ANIWATCH_API_BASE_PATH || DEFAULT_API_BASE_PATH;
const apiTimeoutMs = Number(process.env.ANIWATCH_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

const apiClient: AxiosInstance = axios.create({
  baseURL: `${apiBaseUrl}${apiBasePath}`,
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

async function withProviderFallback<T>(
  methodName: string,
  apiCall: () => Promise<T>,
  packageCall: () => Promise<T>
): Promise<T> {
  if (shouldUseApiProvider) {
    try {
      return await apiCall();
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
