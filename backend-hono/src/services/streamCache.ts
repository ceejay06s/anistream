import { Redis } from '@upstash/redis';

// Initialize Redis client (gracefully handle missing env vars)
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('[StreamCache] Redis client initialized');
  } else {
    console.log('[StreamCache] Redis not configured - caching disabled');
  }
} catch (err) {
  console.error('[StreamCache] Failed to initialize Redis:', err);
}

export interface CachedServer {
  server: string;
  successCount: number;
  lastSuccess: number;
  failedServers: string[];
}

// Cache key format: "stream:{episodeId}:{category}"
function getCacheKey(episodeId: string, category: string): string {
  // Normalize the episodeId to handle special characters
  const normalizedId = episodeId.replace(/[?&=]/g, ':');
  return `stream:${normalizedId}:${category}`;
}

/** Key for full source response cache: "stream:sources:{episodeId}:{server}:{category}" */
function getSourcesCacheKey(episodeId: string, server: string, category: string): string {
  const normalizedId = episodeId.replace(/[?&=]/g, ':');
  return `stream:sources:${normalizedId}:${server}:${category}`;
}

/** Cached full streaming response (sources, tracks, headers, etc.) */
export interface CachedStreamingData {
  sources: Array<{ url: string; quality: string; isM3U8: boolean }>;
  headers?: Record<string, string>;
  tracks?: Array<{ url: string; lang: string }>;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  embedURL?: string;
}

const SOURCES_CACHE_TTL_SEC = 2 * 60 * 60; // 2 hours

/**
 * Get cached streaming sources (full response) for an episode.
 * Returns null on miss or if Redis is not configured.
 */
export async function getCachedSources(
  episodeId: string,
  server: string,
  category: string
): Promise<CachedStreamingData | null> {
  if (!redis) return null;
  try {
    const key = getSourcesCacheKey(episodeId, server, category);
    const cached = await redis.get<CachedStreamingData>(key);
    if (cached?.sources?.length) {
      console.log(`[StreamCache] Sources cache HIT: ${key}`);
      return cached;
    }
    return null;
  } catch (err) {
    console.error('[StreamCache] Sources cache read error:', err);
    return null;
  }
}

/**
 * Store streaming sources response in cache.
 */
export async function setCachedSources(
  episodeId: string,
  server: string,
  category: string,
  data: CachedStreamingData
): Promise<void> {
  if (!redis || !data?.sources?.length) return;
  try {
    const key = getSourcesCacheKey(episodeId, server, category);
    await redis.set(key, data, { ex: SOURCES_CACHE_TTL_SEC });
    console.log(`[StreamCache] Cached sources for ${key} (${data.sources.length} sources)`);
  } catch (err) {
    console.error('[StreamCache] Sources cache write error:', err);
  }
}

/**
 * Get cached server info for an episode
 */
export async function getCachedServer(
  episodeId: string,
  category: string
): Promise<CachedServer | null> {
  if (!redis) return null;

  try {
    const key = getCacheKey(episodeId, category);
    const cached = await redis.get<CachedServer>(key);

    if (cached) {
      console.log(`[StreamCache] Cache HIT for ${key}: server=${cached.server}, successCount=${cached.successCount}`);
    } else {
      console.log(`[StreamCache] Cache MISS for ${key}`);
    }

    return cached;
  } catch (err) {
    console.error('[StreamCache] Cache read error:', err);
    return null; // Fail silently, continue without cache
  }
}

/**
 * Save working server to cache
 */
export async function setCachedServer(
  episodeId: string,
  category: string,
  server: string,
  failedServers: string[] = []
): Promise<void> {
  if (!redis) return;

  try {
    const key = getCacheKey(episodeId, category);
    const existing = await redis.get<CachedServer>(key);

    const data: CachedServer = {
      server,
      successCount: (existing?.successCount || 0) + 1,
      lastSuccess: Date.now(),
      // Merge failed servers, deduplicate
      failedServers: [...new Set([...(existing?.failedServers || []), ...failedServers])],
    };

    // TTL: 6 hours (21600 seconds) - streams may change but not frequently
    await redis.set(key, data, { ex: 21600 });

    console.log(`[StreamCache] Cached server for ${key}: ${server} (successCount: ${data.successCount})`);
  } catch (err) {
    console.error('[StreamCache] Cache write error:', err);
  }
}

/**
 * Mark a server as failed for an episode
 */
export async function markServerFailed(
  episodeId: string,
  category: string,
  failedServer: string
): Promise<void> {
  if (!redis) return;

  try {
    const key = getCacheKey(episodeId, category);
    const existing = await redis.get<CachedServer>(key);

    if (existing) {
      // Add to failed servers list if not already there
      if (!existing.failedServers.includes(failedServer)) {
        existing.failedServers.push(failedServer);
        await redis.set(key, existing, { ex: 21600 });
        console.log(`[StreamCache] Marked ${failedServer} as failed for ${key}`);
      }
    } else {
      // Create new entry with just the failed server info
      const data: CachedServer = {
        server: '',
        successCount: 0,
        lastSuccess: 0,
        failedServers: [failedServer],
      };
      await redis.set(key, data, { ex: 21600 });
      console.log(`[StreamCache] Created entry with failed server ${failedServer} for ${key}`);
    }
  } catch (err) {
    console.error('[StreamCache] Cache update error:', err);
  }
}

/**
 * Clear cache for an episode (useful for debugging/admin)
 */
export async function clearCache(episodeId: string, category: string): Promise<void> {
  if (!redis) return;

  try {
    const key = getCacheKey(episodeId, category);
    await redis.del(key);
    console.log(`[StreamCache] Cleared cache for ${key}`);
  } catch (err) {
    console.error('[StreamCache] Cache clear error:', err);
  }
}

/**
 * Check if Redis is configured and available
 */
export function isCacheEnabled(): boolean {
  return redis !== null;
}
