import { API_BASE_URL } from './api';

/**
 * Verifies a reCAPTCHA token with the backend
 * @param token The reCAPTCHA token from executeRecaptcha
 * @returns Promise<boolean> - true if verification succeeds
 */
export async function verifyRecaptchaToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recaptcha/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      console.error('reCAPTCHA verification request failed:', response.status);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}
