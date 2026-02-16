/**
 * reCAPTCHA configuration
 * Set EXPO_PUBLIC_RECAPTCHA_SITE_KEY in your environment variables
 * Get your site key from: https://www.google.com/recaptcha/admin
 */
export const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY || '6Lfx8WwsAAAAAPjYien995uAFbBR_tcrym7BGs7G';

/**
 * Check if reCAPTCHA is configured
 */
export const isRecaptchaEnabled = (): boolean => {
  return typeof RECAPTCHA_SITE_KEY === 'string' && RECAPTCHA_SITE_KEY.length > 0;
};
