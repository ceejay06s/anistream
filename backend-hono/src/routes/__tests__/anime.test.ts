import { describe, it, expect, beforeEach, jest } from 'jest';
import { animeRoutes } from '../anime.js';
import * as animeService from '../../services/animeService.js';

// Mock the anime service
jest.mock('../../services/animeService.js');

describe('Anime Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /trending', () => {
    it('should return trending anime successfully', async () => {
      const mockAnime = [
        { id: '1', name: 'Test Anime', poster: 'test.jpg' },
      ];
      (animeService.getTrendingAnime as jest.Mock).mockResolvedValue(mockAnime);

      const req = new Request('http://localhost/api/anime/trending');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; data: any };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAnime);
      expect(animeService.getTrendingAnime).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      (animeService.getTrendingAnime as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const req = new Request('http://localhost/api/anime/trending');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; error?: string };

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Service error');
    });
  });

  describe('GET /search', () => {
    it('should return search results with query', async () => {
      const mockResults = [
        { id: '1', name: 'Test Anime', poster: 'test.jpg' },
      ];
      (animeService.searchAnime as jest.Mock).mockResolvedValue(mockResults);

      const req = new Request('http://localhost/api/anime/search?q=naruto');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; data: any };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResults);
      expect(animeService.searchAnime).toHaveBeenCalledWith('naruto', expect.any(Object));
    });

    it('should return 400 if query is missing', async () => {
      const req = new Request('http://localhost/api/anime/search');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { error: string };

      expect(res.status).toBe(400);
      expect(data.error).toContain('Query parameter "q" is required');
    });

    it('should handle filters correctly', async () => {
      const mockResults = [];
      (animeService.searchAnime as jest.Mock).mockResolvedValue(mockResults);

      const req = new Request('http://localhost/api/anime/search?q=test&type=tv&page=2');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; data: any };

      expect(res.status).toBe(200);
      expect(animeService.searchAnime).toHaveBeenCalledWith('test', expect.objectContaining({
        type: 'tv',
        page: 2,
      }));
    });
  });

  describe('GET /info/:animeId', () => {
    it('should return anime info successfully', async () => {
      const mockInfo = {
        id: 'test-id',
        name: 'Test Anime',
        description: 'Test description',
        poster: 'test.jpg',
        genres: ['Action'],
        episodes: { sub: 12, dub: 12 },
      };
      (animeService.getAnimeInfo as jest.Mock).mockResolvedValue(mockInfo);

      const req = new Request('http://localhost/api/anime/info/test-id');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; data: any };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockInfo);
      expect(animeService.getAnimeInfo).toHaveBeenCalledWith('test-id');
    });

    it('should return 404 if anime not found', async () => {
      (animeService.getAnimeInfo as jest.Mock).mockResolvedValue(null);

      const req = new Request('http://localhost/api/anime/info/non-existent');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; error: string };

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Anime not found');
    });
  });

  describe('GET /episodes/:animeId', () => {
    it('should return episodes successfully', async () => {
      const mockEpisodes = [
        { episodeId: 'ep1', number: 1, title: 'Episode 1' },
        { episodeId: 'ep2', number: 2, title: 'Episode 2' },
      ];
      (animeService.getAnimeEpisodes as jest.Mock).mockResolvedValue(mockEpisodes);

      const req = new Request('http://localhost/api/anime/episodes/test-id');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; data: any };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockEpisodes);
    });
  });

  describe('GET /category/:category', () => {
    it('should return category anime', async () => {
      const mockResults = [{ id: '1', name: 'Test', poster: 'test.jpg' }];
      (animeService.getCategoryAnime as jest.Mock).mockResolvedValue(mockResults);

      const req = new Request('http://localhost/api/anime/category/movie?page=1');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; data: any };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(animeService.getCategoryAnime).toHaveBeenCalledWith('movie', 1);
    });
  });

  describe('GET /genre/:genre', () => {
    it('should return genre anime', async () => {
      const mockResults = [{ id: '1', name: 'Test', poster: 'test.jpg' }];
      (animeService.getGenreAnime as jest.Mock).mockResolvedValue(mockResults);

      const req = new Request('http://localhost/api/anime/genre/action?page=1');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; data: any };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(animeService.getGenreAnime).toHaveBeenCalledWith('action', 1);
    });
  });

  describe('GET /az/:letter', () => {
    it('should return A-Z anime', async () => {
      const mockResults = [{ id: '1', name: 'Test', poster: 'test.jpg' }];
      (animeService.getAZAnime as jest.Mock).mockResolvedValue(mockResults);

      const req = new Request('http://localhost/api/anime/az/A?page=1');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; data: any };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(animeService.getAZAnime).toHaveBeenCalledWith('A', 1);
    });
  });

  describe('GET /filter', () => {
    it('should filter anime with multiple parameters', async () => {
      const mockResults = [{ id: '1', name: 'Test', poster: 'test.jpg' }];
      (animeService.filterAnime as jest.Mock).mockResolvedValue(mockResults);

      const req = new Request('http://localhost/api/anime/filter?q=test&type=tv&status=ongoing&page=1');
      const res = await animeRoutes.fetch(req);
      const data = await res.json() as { success: boolean; data: any };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(animeService.filterAnime).toHaveBeenCalledWith(expect.objectContaining({
        q: 'test',
        type: 'tv',
        status: 'ongoing',
        page: 1,
      }));
    });
  });
});
