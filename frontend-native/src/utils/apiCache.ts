import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(`@api_cache:${key}`);
    if (raw) {
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.ts < CACHE_TTL) {
        return entry.data;
      }
    }
  } catch {
    // Cache read failed — proceed to fetch
  }

  const data = await fetcher();

  try {
    await AsyncStorage.setItem(
      `@api_cache:${key}`,
      JSON.stringify({ data, ts: Date.now() } satisfies CacheEntry<T>)
    );
  } catch {
    // Cache write failed — non-critical
  }

  return data;
}

export function clearApiCache(key?: string) {
  if (key) {
    return AsyncStorage.removeItem(`@api_cache:${key}`);
  }
  // Clear all api cache keys
  return AsyncStorage.getAllKeys().then(keys => {
    const cacheKeys = keys.filter(k => k.startsWith('@api_cache:'));
    return AsyncStorage.multiRemove(cacheKeys);
  });
}
