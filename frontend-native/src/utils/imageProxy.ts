import { Platform } from 'react-native';
import { API_BASE_URL } from '../services/api';

/**
 * Proxy image URLs through backend to avoid CORS issues on web
 * Only proxies external URLs on web platform
 */
export function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Only proxy on web platform
  if (Platform.OS !== 'web') {
    return url;
  }

  // Check if it's an external URL (not localhost or same origin)
  try {
    const urlObj = new URL(url);
    const isExternal = urlObj.hostname !== 'localhost' && 
                      urlObj.hostname !== '127.0.0.1' &&
                      !urlObj.hostname.includes(window.location.hostname);
    
    // Only proxy external URLs
    if (isExternal) {
      return `${API_BASE_URL}/api/streaming/proxy?url=${encodeURIComponent(url)}`;
    }
  } catch (e) {
    // If URL parsing fails, return original
    console.warn('Failed to parse image URL:', url);
  }

  return url;
}
