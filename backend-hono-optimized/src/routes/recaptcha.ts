import { Hono } from 'hono';
import { verifyRecaptcha } from '../utils/recaptcha.js';

export const recaptchaRoutes = new Hono();

/**
 * POST /api/recaptcha/verify
 * Verifies a reCAPTCHA token
 * 
 * Body: { token: string, remoteip?: string }
 * Returns: { success: boolean, ... }
 */
recaptchaRoutes.post('/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { token, remoteip } = body;

    if (!token) {
      return c.json({ error: 'Token is required' }, 400);
    }

    // Get client IP from request headers
    const clientIp = remoteip || 
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown';

    const result = await verifyRecaptcha(token, clientIp);

    return c.json(result);
  } catch (error: any) {
    console.error('reCAPTCHA verification error:', error);
    return c.json(
      { 
        success: false, 
        error: error.message || 'Verification failed' 
      },
      500
    );
  }
});
