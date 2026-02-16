import { Platform } from 'react-native';

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
        render: (elementId: string, options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
        }) => number;
        reset: (widgetId: number) => void;
      };
      // Fallback for non-enterprise (if needed)
      ready?: (callback: () => void) => void;
      execute?: (siteKey: string, options: { action: string }) => Promise<string>;
      render?: (elementId: string, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback': () => void;
        'error-callback': () => void;
      }) => number;
      reset?: (widgetId: number) => void;
    };
  }
}

let scriptLoaded = false;
let scriptLoading = false;

/**
 * Loads the Google reCAPTCHA script dynamically
 */
function loadRecaptchaScript(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA is only available on web'));
  }

  if (window.grecaptcha?.enterprise) {
    return Promise.resolve();
  }

  if (scriptLoaded) {
    return Promise.resolve();
  }

  if (scriptLoading) {
    // Wait for existing load to complete
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.grecaptcha?.enterprise) {
          clearInterval(checkInterval);
          scriptLoaded = true;
          resolve();
        } else if (!scriptLoading) {
          clearInterval(checkInterval);
          reject(new Error('Failed to load reCAPTCHA Enterprise script'));
        }
      }, 100);
    });
  }

  scriptLoading = true;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/enterprise.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      // Wait for grecaptcha.enterprise to be available
      const checkInterval = setInterval(() => {
        if (window.grecaptcha?.enterprise) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.grecaptcha?.enterprise) {
          reject(new Error('reCAPTCHA Enterprise script loaded but grecaptcha.enterprise is not available'));
        }
      }, 5000);
    };
    script.onerror = () => {
      scriptLoading = false;
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Executes reCAPTCHA v3 (invisible) and returns the token
 * @param siteKey Your reCAPTCHA site key
 * @param action The action name (e.g., 'submit', 'login', 'signup')
 */
export async function executeRecaptcha(
  siteKey: string,
  action: string = 'submit'
): Promise<string> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    throw new Error('reCAPTCHA is only available on web');
  }

  await loadRecaptchaScript();

  if (!window.grecaptcha?.enterprise) {
    throw new Error('reCAPTCHA Enterprise is not available');
  }

  return new Promise((resolve, reject) => {
    window.grecaptcha.enterprise!.ready(async () => {
      try {
        const token = await window.grecaptcha.enterprise!.execute(siteKey, { action });
        resolve(token);
      } catch (error: any) {
        // If Enterprise fails, try falling back to regular reCAPTCHA if available
        if (window.grecaptcha?.execute && error?.message?.includes('Invalid site key')) {
          try {
            const token = await window.grecaptcha.execute(siteKey, { action });
            resolve(token);
          } catch (fallbackError) {
            reject(fallbackError);
          }
        } else {
          reject(error);
        }
      }
    });
  });
}

/**
 * Renders a reCAPTCHA v2 widget (checkbox) and returns the token via callback
 * @param elementId The ID of the DOM element to render the widget in
 * @param siteKey Your reCAPTCHA site key
 * @param callback Function called with the token when verification succeeds
 * @param onExpired Function called when the token expires
 * @param onError Function called when an error occurs
 * @returns The widget ID for resetting later
 */
export async function renderRecaptcha(
  elementId: string,
  siteKey: string,
  callback: (token: string) => void,
  onExpired?: () => void,
  onError?: () => void
): Promise<number> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    throw new Error('reCAPTCHA is only available on web');
  }

  await loadRecaptchaScript();

  if (!window.grecaptcha?.enterprise) {
    throw new Error('reCAPTCHA Enterprise is not available');
  }

  return new Promise((resolve, reject) => {
    window.grecaptcha.enterprise!.ready(() => {
      try {
        const widgetId = window.grecaptcha.enterprise!.render(elementId, {
          sitekey: siteKey,
          callback: callback,
          'expired-callback': onExpired || (() => {}),
          'error-callback': onError || (() => {}),
        });
        resolve(widgetId);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Resets a reCAPTCHA v2 widget
 * @param widgetId The widget ID returned from renderRecaptcha
 */
export function resetRecaptcha(widgetId: number): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.grecaptcha?.enterprise) {
    return;
  }
  window.grecaptcha.enterprise.reset(widgetId);
}
