/**
 * reCAPTCHA verification utility
 */
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export interface RecaptchaVerificationResult {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/**
 * Verifies a reCAPTCHA token with Google's API
 * @param token The reCAPTCHA token from the frontend
 * @param remoteip Optional: The user's IP address
 * @returns Verification result
 */
export async function verifyRecaptcha(
  token: string,
  remoteip?: string
): Promise<RecaptchaVerificationResult> {
  if (!token) {
    return {
      success: false,
      'error-codes': ['missing-input-response'],
    };
  }

  if (!RECAPTCHA_SECRET_KEY) {
    return {
      success: false,
      'error-codes': ['missing-input-secret'],
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', RECAPTCHA_SECRET_KEY);
    formData.append('response', token);
    if (remoteip) {
      formData.append('remoteip', remoteip);
    }

    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return {
        success: false,
        'error-codes': ['network-error'],
      };
    }

    const data = await response.json();
    return data as RecaptchaVerificationResult;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return {
      success: false,
      'error-codes': ['internal-error'],
    };
  }
}

/**
 * Middleware helper to verify reCAPTCHA token from request
 * Returns the verification result or throws an error
 */
export async function verifyRecaptchaFromRequest(
  token: string | undefined,
  remoteip?: string
): Promise<RecaptchaVerificationResult> {
  if (!token) {
    throw new Error('reCAPTCHA token is required');
  }

  const result = await verifyRecaptcha(token, remoteip);

  if (!result.success) {
    const errors = result['error-codes'] || ['unknown-error'];
    throw new Error(`reCAPTCHA verification failed: ${errors.join(', ')}`);
  }

  return result;
}
