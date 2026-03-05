import { Platform } from 'react-native';
import { executeRecaptcha } from '@/utils/recaptcha';
import { isRecaptchaEnabled, RECAPTCHA_SITE_KEY } from '@/config/recaptcha';
import { verifyRecaptchaToken } from '@/services/recaptchaService';

/**
 * Run a reCAPTCHA check for the given action (web only, non-blocking on failure).
 * Call this before any user-submitted action (create_post, add_comment, etc.).
 */
export async function withRecaptcha(action: string): Promise<void> {
  if (!isRecaptchaEnabled() || Platform.OS !== 'web') return;
  try {
    const token = await executeRecaptcha(RECAPTCHA_SITE_KEY, action);
    const isValid = await verifyRecaptchaToken(token);
    if (!isValid) throw new Error('reCAPTCHA verification failed');
  } catch (err) {
    console.warn('reCAPTCHA check failed:', err);
    // non-blocking — user action continues regardless
  }
}
