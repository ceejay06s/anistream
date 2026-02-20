import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getProxiedImageUrl } from '../imageProxy';
import { Platform } from 'react-native';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

// Mock API_BASE_URL
jest.mock('../../services/api', () => ({
  API_BASE_URL: 'http://localhost:8801',
}));

describe('Image Proxy Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).window = {
      location: {
        hostname: 'anistream.app',
      },
    };
  });

  describe('getProxiedImageUrl', () => {
    it('should return null for null/undefined input', () => {
      expect(getProxiedImageUrl(null)).toBeNull();
      expect(getProxiedImageUrl(undefined)).toBeNull();
    });

    it('should proxy URLs on web platform', () => {
      Platform.OS = 'web';
      const originalUrl = 'https://example.com/image.jpg';
      const proxied = getProxiedImageUrl(originalUrl);

      expect(proxied).toContain('http://localhost:8801');
      expect(proxied).toContain('/api/streaming/proxy');
      expect(proxied).toContain(encodeURIComponent(originalUrl));
    });

    it('should return original URL on native platforms', () => {
      Platform.OS = 'ios';
      const originalUrl = 'https://example.com/image.jpg';
      const proxied = getProxiedImageUrl(originalUrl);

      expect(proxied).toBe(originalUrl);
    });

    it('should handle URLs with special characters', () => {
      Platform.OS = 'web';
      const originalUrl = 'https://example.com/image%20with%20spaces.jpg?param=value';
      const proxied = getProxiedImageUrl(originalUrl);

      expect(proxied).toContain('http://localhost:8801');
      expect(proxied).toContain('/api/streaming/proxy');
    });
  });
});
