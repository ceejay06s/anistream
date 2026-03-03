import { getEpisodeServers, getEpisodeSources, type StreamingData } from './streamingService.js';
import {
  getCachedServer,
  markServerFailed,
  setCachedServer,
  type CachedServer,
} from './streamCache.js';

export const SERVER_PRIORITY = ['hd-1', 'hd-2', 'megacloud', 'streamsb', 'streamtape'] as const;

export type StreamCategory = 'sub' | 'dub' | 'raw';

export interface StreamResolutionResult {
  success: boolean;
  data: StreamingData;
  server?: string;
  triedServers: string[];
  fromCache?: boolean;
}

function normalizeServerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function normalizeEpisodeId(episodeId: string): string {
  if (episodeId.includes('?') && !episodeId.includes('?ep=')) {
    return episodeId.split('?')[0];
  }
  return episodeId;
}

function getServersFromProviderList(servers: Awaited<ReturnType<typeof getEpisodeServers>>, category: StreamCategory): string[] {
  if (!Array.isArray(servers)) {
    return [];
  }

  const normalized = servers
    .filter((server) => !server.category || server.category === category)
    .map((server) => normalizeServerName(server.name || server.id || ''))
    .filter(Boolean);

  return [...new Set(normalized)];
}

function buildServerOrder(
  preferredServer: string,
  fallback: boolean,
  providerServers: string[],
  cache: CachedServer | null
): string[] {
  const preferred = normalizeServerName(preferredServer || 'hd-1');
  const failed = new Set(cache?.failedServers || []);
  const order: string[] = [];

  const push = (server: string) => {
    if (!server || failed.has(server) || order.includes(server)) {
      return;
    }
    order.push(server);
  };

  if (cache?.server) {
    push(cache.server);
  }

  if (fallback) {
    providerServers.forEach(push);
    SERVER_PRIORITY.forEach(push);
    return order;
  }

  push(preferred);
  providerServers.forEach(push);
  SERVER_PRIORITY.forEach(push);

  return order;
}

export async function resolveEpisodeSources(options: {
  episodeId: string;
  category: StreamCategory;
  preferredServer?: string;
  fallback?: boolean;
}): Promise<StreamResolutionResult> {
  const episodeId = normalizeEpisodeId(options.episodeId);
  const category = options.category;
  const preferredServer = options.preferredServer || 'hd-1';
  const fallback = options.fallback === true;

  const cache = await getCachedServer(episodeId, category);
  let providerServers: string[] = [];
  try {
    providerServers = getServersFromProviderList(await getEpisodeServers(episodeId), category);
  } catch (error) {
    console.warn('Failed to fetch provider servers, using defaults only:', error);
  }

  const serversToTry = buildServerOrder(preferredServer, fallback, providerServers, cache);
  const failedServers: string[] = [];

  for (const server of serversToTry) {
    try {
      const sources = await getEpisodeSources(episodeId, server, category);
      if (sources?.sources?.length) {
        await setCachedServer(episodeId, category, server, failedServers);
        return {
          success: true,
          data: sources,
          server,
          triedServers: [...failedServers, server],
          fromCache: Boolean(cache?.server && cache.server === server),
        };
      }
    } catch (error) {
      console.warn(`Server ${server} failed for ${episodeId}:`, error);
    }

    failedServers.push(server);
    await markServerFailed(episodeId, category, server);
  }

  return {
    success: false,
    data: { sources: [] },
    triedServers: failedServers,
  };
}
