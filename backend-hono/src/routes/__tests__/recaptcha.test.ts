import { describe, it, expect, beforeEach, jest } from 'jest';
import { recaptchaRoutes } from '../recaptcha.js';
import { verifyRecaptcha } from '../../utils/recaptcha.js';

// Mock the recaptcha utility
jest.mock('../../utils/recaptcha.js');

describe('reCAPTCHA Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /verify', () => {
    it('should verify valid reCAPTCHA token', async () => {
      (verifyRecaptcha as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request('http://localhost/api/recaptcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' }),
      });

      const res = await recaptchaRoutes.fetch(req);
      const data = await res.json() as { success: boolean; error?: string };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(verifyRecaptcha).toHaveBeenCalledWith('valid-token', expect.any(String));
    });

    it('should reject invalid reCAPTCHA token', async () => {
      (verifyRecaptcha as jest.Mock).mockResolvedValue({ success: false, error: 'Invalid token' });

      const req = new Request('http://localhost/api/recaptcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token' }),
      });

      const res = await recaptchaRoutes.fetch(req);
      const data = await res.json() as { success: boolean; error?: string };

      expect(res.status).toBe(200);
      expect(data.success).toBe(false);
    });

    it('should require token parameter', async () => {
      const req = new Request('http://localhost/api/recaptcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await recaptchaRoutes.fetch(req);
      const data = await res.json() as { success: boolean; error?: string };

      expect(res.status).toBe(400);
      expect(data.error).toContain('Token is required');
    });

    it('should handle verification errors', async () => {
      (verifyRecaptcha as jest.Mock).mockRejectedValue(new Error('Network error'));

      const req = new Request('http://localhost/api/recaptcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test-token' }),
      });

      const res = await recaptchaRoutes.fetch(req);
      const data = await res.json() as { success: boolean; error?: string };

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});
