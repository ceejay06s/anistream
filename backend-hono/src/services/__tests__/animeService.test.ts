import { describe, it, expect, beforeEach, jest } from 'jest';
import { HiAnime } from 'aniwatch';
import * as animeService from '../animeService.js';

// Mock the aniwatch library
jest.mock('aniwatch', () => ({
  HiAnime: {
    Scraper: jest.fn().mockImplementation(() => ({
      search: jest.fn(),
      getInfo: jest.fn(),
      getEpisodes: jest.fn(),
      getTrending: jest.fn(),
      getCategory: jest.fn(),
      getGenre: jest.fn(),
      getAZ: jest.fn(),
      filter: jest.fn(),
    })),
  },
}));

describe('Anime Service', () => {
  let mockScraper: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScraper = new HiAnime.Scraper();
  });

  describe('searchAnime', () => {
    it('should search anime successfully', async () => {
      const mockResults = [
        { id: '1', name: 'Test Anime', poster: 'test.jpg' },
      ];
      mockScraper.search.mockResolvedValue(mockResults);

      const results = await animeService.searchAnime('naruto', {});

      expect(results).toEqual(mockResults);
      expect(mockScraper.search).toHaveBeenCalledWith('naruto', expect.any(Object));
    });

    it('should handle search errors', async () => {
      mockScraper.search.mockRejectedValue(new Error('Search failed'));

      await expect(animeService.searchAnime('test', {})).rejects.toThrow('Search failed');
    });
  });

  describe('getAnimeInfo', () => {
    it('should get anime info successfully', async () => {
      const mockInfo = {
        id: 'test-id',
        name: 'Test Anime',
        description: 'Test description',
        poster: 'test.jpg',
        genres: ['Action'],
        episodes: { sub: 12, dub: 12 },
      };
      mockScraper.getInfo.mockResolvedValue(mockInfo);

      const info = await animeService.getAnimeInfo('test-id');

      expect(info).toEqual(mockInfo);
      expect(mockScraper.getInfo).toHaveBeenCalledWith('test-id');
    });

    it('should return null if anime not found', async () => {
      mockScraper.getInfo.mockResolvedValue(null);

      const info = await animeService.getAnimeInfo('non-existent');

      expect(info).toBeNull();
    });
  });

  describe('getAnimeEpisodes', () => {
    it('should get anime episodes successfully', async () => {
      const mockEpisodes = [
        { episodeId: 'ep1', number: 1, title: 'Episode 1' },
        { episodeId: 'ep2', number: 2, title: 'Episode 2' },
      ];
      mockScraper.getEpisodes.mockResolvedValue(mockEpisodes);

      const episodes = await animeService.getAnimeEpisodes('test-id');

      expect(episodes).toEqual(mockEpisodes);
      expect(mockScraper.getEpisodes).toHaveBeenCalledWith('test-id');
    });
  });

  describe('getTrendingAnime', () => {
    it('should get trending anime', async () => {
      const mockTrending = [
        { id: '1', name: 'Trending 1', poster: 'poster1.jpg' },
        { id: '2', name: 'Trending 2', poster: 'poster2.jpg' },
      ];
      mockScraper.getTrending.mockResolvedValue(mockTrending);

      const results = await animeService.getTrendingAnime();

      expect(results).toEqual(mockTrending);
      expect(mockScraper.getTrending).toHaveBeenCalled();
    });
  });

  describe('getCategoryAnime', () => {
    it('should get category anime', async () => {
      const mockCategory = [
        { id: '1', name: 'Movie 1', poster: 'poster1.jpg' },
      ];
      mockScraper.getCategory.mockResolvedValue(mockCategory);

      const results = await animeService.getCategoryAnime('movie', 1);

      expect(results).toEqual(mockCategory);
      expect(mockScraper.getCategory).toHaveBeenCalledWith('movie', 1);
    });
  });

  describe('getGenreAnime', () => {
    it('should get genre anime', async () => {
      const mockGenre = [
        { id: '1', name: 'Action Anime', poster: 'poster1.jpg' },
      ];
      mockScraper.getGenre.mockResolvedValue(mockGenre);

      const results = await animeService.getGenreAnime('action', 1);

      expect(results).toEqual(mockGenre);
      expect(mockScraper.getGenre).toHaveBeenCalledWith('action', 1);
    });
  });

  describe('getAZAnime', () => {
    it('should get A-Z anime', async () => {
      const mockAZ = [
        { id: '1', name: 'A Anime', poster: 'poster1.jpg' },
      ];
      mockScraper.getAZ.mockResolvedValue(mockAZ);

      const results = await animeService.getAZAnime('A', 1);

      expect(results).toEqual(mockAZ);
      expect(mockScraper.getAZ).toHaveBeenCalledWith('A', 1);
    });
  });

  describe('filterAnime', () => {
    it('should filter anime with multiple parameters', async () => {
      const mockFiltered = [
        { id: '1', name: 'Filtered Anime', poster: 'poster1.jpg' },
      ];
      mockScraper.filter.mockResolvedValue(mockFiltered);

      const filters = {
        q: 'test',
        type: 'tv',
        status: 'ongoing',
        page: 1,
      };

      const results = await animeService.filterAnime(filters);

      expect(results).toEqual(mockFiltered);
      expect(mockScraper.filter).toHaveBeenCalledWith(filters);
    });
  });
});
