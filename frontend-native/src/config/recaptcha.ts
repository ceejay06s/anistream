/**
 * reCAPTCHA configuration
 * Set EXPO_PUBLIC_RECAPTCHA_SITE_KEY in your environment variables
 * Get your site key from: https://www.google.com/recaptcha/admin
 */
export const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY || '';

/**
 * Check if reCAPTCHA is configured and should run (disabled on localhost so dev works without key allowed domains)
 */
export const isRecaptchaEnabled = (): boolean => {
  if (typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1')) {
    return false;
  }
  return typeof RECAPTCHA_SITE_KEY === 'string' && RECAPTCHA_SITE_KEY.length > 0;
};
