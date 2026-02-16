import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { verifyRecaptcha } from '../recaptcha.js';

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('reCAPTCHA Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyRecaptcha', () => {
    it('should verify valid token successfully', async () => {
      const mockResponse = {
        success: true,
        challenge_ts: '2024-01-01T00:00:00Z',
        hostname: 'example.com',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await verifyRecaptcha('valid-token');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.google.com/recaptcha/api/siteverify',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
    });

    it('should return false for invalid token', async () => {
      const mockResponse = {
        success: false,
        'error-codes': ['invalid-input-response'],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await verifyRecaptcha('invalid-token');

      expect(result.success).toBe(false);
      expect(result['error-codes']).toContain('invalid-input-response');
    });

    it('should return error for missing token', async () => {
      const result = await verifyRecaptcha('');

      expect(result.success).toBe(false);
      expect(result['error-codes']).toContain('missing-input-response');
    });

    it('should include remoteip if provided', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await verifyRecaptcha('token', '192.168.1.1');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = fetchCall[1].body;

      expect(body).toContain('remoteip=192.168.1.1');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await verifyRecaptcha('token');

      expect(result.success).toBe(false);
      expect(result['error-codes']).toContain('network-error');
    });

    it('should handle fetch exceptions', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await verifyRecaptcha('token');

      expect(result.success).toBe(false);
      expect(result['error-codes']).toContain('internal-error');
    });
  });
});
