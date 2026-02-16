import { API_BASE_URL } from './api';
import axios from 'axios';

/**
 * Get a signed URL for a file in Backblaze B2 (for private buckets)
 * This generates a temporary signed URL that expires after 7 days
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
const CACHE_DURATION = 6 * 24 * 60 * 60 * 1000; // 6 days (refresh before 7-day expiry)

export async function getOrRefreshSignedUrl(
  filePath: string,
  forceRefresh: boolean = false
): Promise<string> {
  const cached = urlCache.get(filePath);
  const now = Date.now();

  // Return cached URL if still valid and not forcing refresh
  if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.url;
  }

  // Get a fresh URL
  const newUrl = await getSignedUrl(filePath);
  
  // Cache it
  urlCache.set(filePath, {
    url: newUrl,
    timestamp: now,
  });

  return newUrl;
}

/**
 * Clear the URL cache for a specific file or all files
 * @param filePath Optional file path to clear. If not provided, clears all cached URLs
 */
export function clearUrlCache(filePath?: string): void {
  if (filePath) {
    urlCache.delete(filePath);
  } else {
    urlCache.clear();
  }
}
