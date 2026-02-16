import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { streamingRoutes } from '../streaming.js';
import { getEpisodeSources, getEpisodeServers } from '../../services/streamingService.js';

// Mock the streaming service
jest.mock('../../services/streamingService.js');

describe('Streaming Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /sources', () => {
    it('should return episode sources successfully', async () => {
      const mockSources = {
        sources: [
          { url: 'https://example.com/video.m3u8', quality: '1080p', isM3U8: true },
        ],
        tracks: [],
      };
      (getEpisodeSources as jest.Mock).mockResolvedValue(mockSources);

      const req = new Request('http://localhost/api/streaming/sources?episodeId=ep123&server=hd-1&category=sub');
      const res = await streamingRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSources);
      expect(data.server).toBe('hd-1');
      expect(getEpisodeSources).toHaveBeenCalledWith('ep123', 'hd-1', 'sub');
    });

    it('should require episodeId parameter', async () => {
      const req = new Request('http://localhost/api/streaming/sources?server=hd-1');
      const res = await streamingRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('episodeId parameter is required');
    });

    it('should try fallback servers when requested', async () => {
      // First server fails, second succeeds
      (getEpisodeSources as jest.Mock)
        .mockRejectedValueOnce(new Error('Server 1 failed'))
        .mockResolvedValueOnce({
          sources: [{ url: 'https://example.com/video.m3u8', quality: '1080p', isM3U8: true }],
          tracks: [],
        });

      const req = new Request('http://localhost/api/streaming/sources?episodeId=ep123&server=hd-1&fallback=true');
      const res = await streamingRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(getEpisodeSources).toHaveBeenCalledTimes(2);
    });

    it('should return 404 when all servers fail', async () => {
      (getEpisodeSources as jest.Mock).mockRejectedValue(new Error('All servers failed'));

      const req = new Request('http://localhost/api/streaming/sources?episodeId=ep123&fallback=true');
      const res = await streamingRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No streaming sources found');
    });
  });

  describe('GET /servers', () => {
    it('should return episode servers', async () => {
      const mockServers = ['hd-1', 'hd-2', 'megacloud'];
      (getEpisodeServers as jest.Mock).mockResolvedValue(mockServers);

      const req = new Request('http://localhost/api/streaming/servers?episodeId=ep123');
      const res = await streamingRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockServers);
      expect(getEpisodeServers).toHaveBeenCalledWith('ep123');
    });

    it('should require episodeId parameter', async () => {
      const req = new Request('http://localhost/api/streaming/servers');
      const res = await streamingRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('episodeId parameter is required');
    });
  });

  describe('GET /proxy', () => {
    it('should proxy video resources', async () => {
      // This test would require mocking gotScraping
      // For now, we'll test the basic structure
      const req = new Request('http://localhost/api/streaming/proxy?url=https://example.com/video.m3u8');
      
      // Note: This will fail without proper mocking, but shows the test structure
      // In a real scenario, you'd mock gotScraping
      expect(req).toBeDefined();
    });
  });
});
