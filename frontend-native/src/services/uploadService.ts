import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';
import axios from 'axios';

const SIGNED_URL_STORAGE_KEY_PREFIX = '@anistream_signed_url:';

function signedUrlStorageKey(filePath: string): string {
  return `${SIGNED_URL_STORAGE_KEY_PREFIX}${filePath}`;
}

/** Persist renewed URL so it is reused until expiry (saves the update) */
async function saveSignedUrlToStorage(
  filePath: string,
  url: string,
  timestamp: number
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      signedUrlStorageKey(filePath),
      JSON.stringify({ url, timestamp })
    );
  } catch {
    // Ignore storage errors (e.g. quota, private mode)
  }
}

/** Load previously saved URL if any */
async function loadSignedUrlFromStorage(
  filePath: string
): Promise<{ url: string; timestamp: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(signedUrlStorageKey(filePath));
    if (!raw) return null;
    return JSON.parse(raw) as { url: string; timestamp: number };
  } catch {
    return null;
  }
}

/**
 * Get a signed URL for a file in Backblaze B2 (for private buckets)
 * This generates a temporary signed URL that expires after 5 days
 * You can call this function anytime to get a fresh signed URL
 * 
 * @param filePath The path to the file in the bucket (e.g., "posts/user123/filename.jpg")
 * @returns The signed URL that can be used to access the file
 * @throws Error if the file path is invalid or the request fails
 * 
 * @example
 * // Get a new signed URL anytime
 * const url = await getSignedUrl('posts/user123/image.jpg');
 * 
 * // Refresh an expired URL
 * const newUrl = await getSignedUrl('posts/user123/image.jpg');
 */
export async function getSignedUrl(filePath: string): Promise<string> {
  if (!filePath) {
    throw new Error('File path is required');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/upload/file`, {
      params: { filePath },
    });

    if (response.data.success) {
      return response.data.url;
    } else {
      throw new Error(response.data.error || 'Failed to get signed URL');
    }
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || 'Invalid file path');
    } else if (error.response?.status === 404) {
      throw new Error('File not found');
    } else {
      throw new Error(
        `Failed to get signed URL: ${error.response?.data?.message || error.message || 'Unknown error'}`
      );
    }
  }
}

/**
 * Get signed URL with full response data
 * Returns both the signed URL and public URL (for reference)
 * 
 * @param filePath The path to the file in the bucket
 * @returns Object containing url, publicUrl, and filePath
 */
export async function getSignedUrlWithMetadata(filePath: string): Promise<{
  url: string;
  publicUrl: string;
  filePath: string;
}> {
  if (!filePath) {
    throw new Error('File path is required');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/upload/file`, {
      params: { filePath },
    });

    if (response.data.success) {
      return {
        url: response.data.url,
        publicUrl: response.data.publicUrl,
        filePath: response.data.filePath,
      };
    } else {
      throw new Error(response.data.error || 'Failed to get signed URL');
    }
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || 'Invalid file path');
    } else if (error.response?.status === 404) {
      throw new Error('File not found');
    } else {
      throw new Error(
        `Failed to get signed URL: ${error.response?.data?.message || error.message || 'Unknown error'}`
      );
    }
  }
}

/**
 * Helper function to refresh/get a new signed URL for a file
 * This is useful when you need to ensure you have a valid, non-expired URL
 * 
 * @param filePath The path to the file in the bucket
 * @returns A fresh signed URL
 */
export async function refreshSignedUrl(filePath: string): Promise<string> {
  return getSignedUrl(filePath);
}

/**
 * Get or refresh a signed URL, with optional caching
 * Useful for components that need to display files
 * 
 * @param filePath The path to the file
 * @param forceRefresh If true, always request a new URL even if cached
 * @returns A signed URL
 */
const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 4 * 24 * 60 * 60 * 1000; // 4 days (refresh before 5-day expiry)

/** Update in-memory cache and persist so the renewed URL is saved */
async function setCachedAndSavedUrl(
  filePath: string,
  url: string,
  timestamp: number
): Promise<void> {
  urlCache.set(filePath, { url, timestamp });
  await saveSignedUrlToStorage(filePath, url, timestamp);
}

export async function getOrRefreshSignedUrl(
  filePath: string,
  forceRefresh: boolean = false
): Promise<string> {
  const cached = urlCache.get(filePath);
  const now = Date.now();

  // Return cached URL if still valid, not expired, and not forcing refresh
  if (!forceRefresh && cached) {
    const cacheValid = (now - cached.timestamp) < CACHE_DURATION;
    const urlNotExpired = !isUrlExpired(cached.url);
    if (cacheValid && urlNotExpired) {
      return cached.url;
    }
  }

  // Try stored URL before calling API
  if (!forceRefresh) {
    const stored = await loadSignedUrlFromStorage(filePath);
    if (stored && !isUrlExpired(stored.url)) {
      urlCache.set(filePath, stored);
      return stored.url;
    }
  }

  const newUrl = await getSignedUrl(filePath);
  await setCachedAndSavedUrl(filePath, newUrl, now);
  return newUrl;
}

/**
 * Clear the URL cache for a specific file or all files (memory and persisted)
 * @param filePath Optional file path to clear. If not provided, clears all cached URLs
 */
export async function clearUrlCache(filePath?: string): Promise<void> {
  if (filePath) {
    urlCache.delete(filePath);
    try {
      await AsyncStorage.removeItem(signedUrlStorageKey(filePath));
    } catch {
      // ignore
    }
  } else {
    urlCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => k.startsWith(SIGNED_URL_STORAGE_KEY_PREFIX));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch {
      // ignore
    }
  }
}

/**
 * Check if a signed URL has expired by parsing the expiration timestamp
 * @param signedUrl The signed URL to check
 * @returns true if the URL has expired, false otherwise
 */
function isUrlExpired(signedUrl: string): boolean {
  try {
    const url = new URL(signedUrl);
    const expiresParam = url.searchParams.get('X-Amz-Expires');
    const dateParam = url.searchParams.get('X-Amz-Date');
    
    if (!expiresParam || !dateParam) {
      // If we can't parse expiration, assume it's valid (might be a different URL format)
      return false;
    }
    
    // Parse the date (format: YYYYMMDDTHHmmssZ)
    const year = parseInt(dateParam.substring(0, 4));
    const month = parseInt(dateParam.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateParam.substring(6, 8));
    const hour = parseInt(dateParam.substring(9, 11));
    const minute = parseInt(dateParam.substring(11, 13));
    const second = parseInt(dateParam.substring(13, 15));
    
    const expirationDate = new Date(Date.UTC(year, month, day, hour, minute, second));
    expirationDate.setSeconds(expirationDate.getSeconds() + parseInt(expiresParam));
    
    return expirationDate.getTime() < Date.now();
  } catch (error) {
    // If we can't parse, assume it's still valid
    return false;
  }
}

/**
 * Get a signed URL with automatic renewal if expired.
 * Uses in-memory and persisted cache; when renewed, saves the update so it is reused until expiry.
 *
 * @param filePath The path to the file
 * @returns A valid signed URL (refreshed if expired)
 */
export async function getSignedUrlWithAutoRenewal(filePath: string): Promise<string> {
  const cached = urlCache.get(filePath);
  if (cached && !isUrlExpired(cached.url)) {
    return cached.url;
  }

  // Load from storage so we don't hit the API if we already have a valid saved URL
  const stored = await loadSignedUrlFromStorage(filePath);
  if (stored && !isUrlExpired(stored.url)) {
    urlCache.set(filePath, stored);
    return stored.url;
  }

  const newUrl = await getSignedUrl(filePath);
  const now = Date.now();
  await setCachedAndSavedUrl(filePath, newUrl, now);
  return newUrl;
}

/**
 * Load an image with automatic URL renewal on failure
 * This will automatically refresh the URL if the image fails to load due to expiration
 * Works in both web and React Native environments
 * 
 * @param filePath The path to the file
 * @param onError Optional error callback
 * @returns A promise that resolves with the image URL
 */
export async function loadImageWithAutoRenewal(
  filePath: string,
  onError?: (error: Error) => void
): Promise<string> {
  try {
    // Get URL with auto-renewal
    let url = await getSignedUrlWithAutoRenewal(filePath);
    
    // On web, pre-validate the URL by attempting to load the image
    if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          resolve(url);
        };
        
        img.onerror = async () => {
          // Image failed to load, might be expired - try refreshing
          try {
            await clearUrlCache(filePath);
            const freshUrl = await getSignedUrl(filePath);
            await setCachedAndSavedUrl(filePath, freshUrl, Date.now());

            // Try loading again with fresh URL
            const retryImg = new Image();
            retryImg.onload = () => resolve(freshUrl);
            retryImg.onerror = () => {
              const error = new Error('Failed to load image after URL renewal');
              if (onError) onError(error);
              reject(error);
            };
            retryImg.src = freshUrl;
          } catch (error: any) {
            const err = error instanceof Error ? error : new Error('Failed to renew expired URL');
            if (onError) onError(err);
            reject(err);
          }
        };
        
        img.src = url;
      });
    }
    
    // On React Native or other environments, just return the URL
    // The image component will handle loading and can retry if needed
    return url;
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error('Failed to get signed URL');
    if (onError) onError(err);
    throw err;
  }
}
