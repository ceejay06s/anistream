// Jest globals are available in test environment
import { HiAnime } from 'aniwatch';
import * as streamingService from '../streamingService.js';

// Mock the aniwatch library
jest.mock('aniwatch', () => ({
  HiAnime: {
    Scraper: jest.fn().mockImplementation(() => ({
      getSources: jest.fn(),
      getServers: jest.fn(),
    })),
  },
}));

describe('Streaming Service', () => {
  let mockScraper: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScraper = new HiAnime.Scraper();
  });

  describe('getEpisodeSources', () => {
    it('should get episode sources successfully', async () => {
      const mockSources = {
        sources: [
          { url: 'https://example.com/video.m3u8', quality: '1080p', isM3U8: true },
        ],
        tracks: [
          { url: 'https://example.com/subtitle.vtt', lang: 'en' },
        ],
      };
      mockScraper.getSources.mockResolvedValue(mockSources);

      const sources = await streamingService.getEpisodeSources('ep123', 'hd-1', 'sub');

      expect(sources).toEqual(mockSources);
      expect(mockScraper.getSources).toHaveBeenCalledWith('ep123', 'hd-1', 'sub');
    });

    it('should handle errors gracefully', async () => {
      mockScraper.getSources.mockRejectedValue(new Error('Server error'));

      await expect(
        streamingService.getEpisodeSources('ep123', 'hd-1', 'sub')
      ).rejects.toThrow('Server error');
    });

    it('should handle empty sources', async () => {
      mockScraper.getSources.mockResolvedValue({ sources: [], tracks: [] });

      const sources = await streamingService.getEpisodeSources('ep123', 'hd-1', 'sub');

      expect(sources.sources).toEqual([]);
    });
  });

  describe('getEpisodeServers', () => {
    it('should get episode servers successfully', async () => {
      const mockServers = ['hd-1', 'hd-2', 'megacloud'];
      mockScraper.getServers.mockResolvedValue(mockServers);

      const servers = await streamingService.getEpisodeServers('ep123');

      expect(servers).toEqual(mockServers);
      expect(mockScraper.getServers).toHaveBeenCalledWith('ep123');
    });

    it('should handle errors gracefully', async () => {
      mockScraper.getServers.mockRejectedValue(new Error('Server error'));

      await expect(streamingService.getEpisodeServers('ep123')).rejects.toThrow('Server error');
    });
  });
});
