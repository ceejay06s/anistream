import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { notificationRoutes } from '../notifications.js';
import { checkAnimeUpdatesForAllUsers } from '../../services/animeUpdateService.js';

// Mock the anime update service
jest.mock('../../services/animeUpdateService.js');

describe('Notification Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ANIME_UPDATE_SECRET_TOKEN;
  });

  describe('POST /check-anime-updates', () => {
    it('should check anime updates successfully', async () => {
      const mockResult = {
        totalUsers: 5,
        totalAnime: 20,
        updatesFound: 3,
      };
      (checkAnimeUpdatesForAllUsers as jest.Mock).mockResolvedValue(mockResult);

      const req = new Request('http://localhost/api/notifications/check-anime-updates', {
        method: 'POST',
      });

      const res = await notificationRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalUsers).toBe(5);
      expect(data.totalAnime).toBe(20);
      expect(data.updatesFound).toBe(3);
      expect(checkAnimeUpdatesForAllUsers).toHaveBeenCalledTimes(1);
    });

    it('should require secret token if configured', async () => {
      process.env.ANIME_UPDATE_SECRET_TOKEN = 'secret-token-123';

      const req = new Request('http://localhost/api/notifications/check-anime-updates', {
        method: 'POST',
        // Missing X-Secret-Token header
      });

      const res = await notificationRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept valid secret token', async () => {
      process.env.ANIME_UPDATE_SECRET_TOKEN = 'secret-token-123';
      (checkAnimeUpdatesForAllUsers as jest.Mock).mockResolvedValue({
        totalUsers: 0,
        totalAnime: 0,
        updatesFound: 0,
      });

      const req = new Request('http://localhost/api/notifications/check-anime-updates', {
        method: 'POST',
        headers: {
          'X-Secret-Token': 'secret-token-123',
        },
      });

      const res = await notificationRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      (checkAnimeUpdatesForAllUsers as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const req = new Request('http://localhost/api/notifications/check-anime-updates', {
        method: 'POST',
      });

      const res = await notificationRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Service error');
    });
  });

  describe('GET /check-anime-updates', () => {
    it('should return endpoint information', async () => {
      const req = new Request('http://localhost/api/notifications/check-anime-updates', {
        method: 'GET',
      });

      const res = await notificationRoutes.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Anime update check endpoint');
      expect(data.method).toBe('POST');
    });
  });
});
