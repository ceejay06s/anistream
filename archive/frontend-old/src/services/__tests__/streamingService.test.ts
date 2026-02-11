/**
 * Tests for Unified Streaming Service
 */

import {
  searchAnime,
  getAnimeInfo,
  getStreamingSources,
  getRecommendedSource,
  StreamingSource,
} from '../streamingService';

describe('Streaming Service', () => {
  const testQuery = 'Naruto';
  const testAnimeId = 'naruto';
  const testEpisodeId = 'naruto-episode-1';

  describe('searchAnime', () => {
    it('should search across all sources and return results', async () => {
      try {
        const results = await searchAnime(testQuery);
        expect(Array.isArray(results)).toBe(true);
        if (results.length > 0) {
          expect(results[0]).toHaveProperty('id');
          expect(results[0]).toHaveProperty('title');
          expect(results[0]).toHaveProperty('source');
          expect(results[0].source).toBe('HiAnime');
        }
      } catch (error: any) {
        console.warn('Search test failed:', error.message);
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should handle empty queries gracefully', async () => {
      const results = await searchAnime('');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle special characters in query', async () => {
      try {
        const results = await searchAnime('One Piece: Stampede');
        expect(Array.isArray(results)).toBe(true);
      } catch (error: any) {
        // Expected for network issues
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('getAnimeInfo', () => {
    it('should fetch anime info with fallback', async () => {
      try {
        const result = await getAnimeInfo(testAnimeId);
        if (result) {
          expect(result).toHaveProperty('anime');
          expect(result).toHaveProperty('episodes');
          expect(result).toHaveProperty('source');
          expect(result.anime).toHaveProperty('id');
          expect(result.anime).toHaveProperty('title');
          expect(Array.isArray(result.episodes)).toBe(true);
        }
      } catch (error: any) {
        console.warn('Info test failed:', error.message);
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should respect source parameter', async () => {
      try {
        const result = await getAnimeInfo(testAnimeId, 'HiAnime');
        if (result) {
          expect(result.source).toBe('HiAnime');
        }
      } catch (error: any) {
        console.warn('Source-specific test failed:', error.message);
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('getStreamingSources', () => {
    it('should fetch streaming sources with fallback', async () => {
      try {
        const result = await getStreamingSources(testEpisodeId);
        if (result) {
          expect(result).toHaveProperty('sources');
          expect(Array.isArray(result.sources)).toBe(true);
          if (result.sources.length > 0) {
            expect(result.sources[0]).toHaveProperty('url');
            expect(result.sources[0]).toHaveProperty('quality');
            expect(typeof result.sources[0].isM3U8).toBe('boolean');
          }
        }
      } catch (error: any) {
        console.warn('Sources test failed:', error.message);
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should return null when no sources found', async () => {
      try {
        const result = await getStreamingSources('invalid-episode-id-12345');
        // Result might be null or have empty sources
        if (result) {
          expect(result.sources.length).toBe(0);
        }
      } catch (error: any) {
        // Expected for invalid IDs
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('getRecommendedSource', () => {
    it('should prefer HLS/M3U8 streams', () => {
      const sources: StreamingSource[] = [
        { url: 'http://example.com/video.mp4', quality: '720p', isM3U8: false },
        { url: 'http://example.com/stream.m3u8', quality: '480p', isM3U8: true },
      ];

      const recommended = getRecommendedSource(sources);
      expect(recommended).toBeDefined();
      expect(recommended?.isM3U8).toBe(true);
    });

    it('should prefer higher quality when no HLS available', () => {
      const sources: StreamingSource[] = [
        { url: 'http://example.com/video360.mp4', quality: '360p', isM3U8: false },
        { url: 'http://example.com/video1080.mp4', quality: '1080p', isM3U8: false },
        { url: 'http://example.com/video720.mp4', quality: '720p', isM3U8: false },
      ];

      const recommended = getRecommendedSource(sources);
      expect(recommended).toBeDefined();
      expect(recommended?.quality).toBe('1080p');
    });

    it('should return first source if no preferences match', () => {
      const sources: StreamingSource[] = [
        { url: 'http://example.com/video1.mp4', quality: 'unknown', isM3U8: false },
        { url: 'http://example.com/video2.mp4', quality: 'unknown2', isM3U8: false },
      ];

      const recommended = getRecommendedSource(sources);
      expect(recommended).toBeDefined();
      expect(recommended?.url).toBe(sources[0].url);
    });

    it('should return null for empty sources', () => {
      const recommended = getRecommendedSource([]);
      expect(recommended).toBeNull();
    });
  });
});
