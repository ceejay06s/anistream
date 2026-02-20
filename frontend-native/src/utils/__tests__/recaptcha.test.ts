import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { executeRecaptcha, renderRecaptcha, resetRecaptcha } from '../recaptcha';
import { Platform } from 'react-native';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

// Mock window.grecaptcha
const mockGrecaptcha = {
  ready: jest.fn((callback: any) => callback()),
  execute: jest.fn(() => Promise.resolve('mock-token')),
  render: jest.fn(() => 123),
  reset: jest.fn(),
  enterprise: {
    ready: jest.fn((callback: any) => callback()),
    execute: jest.fn(() => Promise.resolve('mock-token')),
    render: jest.fn(() => 123),
    reset: jest.fn(),
  },
};

describe('reCAPTCHA Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window object
    (global as any).window = {
      grecaptcha: mockGrecaptcha,
      document: {
        createElement: jest.fn(() => ({
          onload: null,
          onerror: null,
          src: '',
          async: false,
          defer: false,
        })),
        head: {
          appendChild: jest.fn(),
        },
      },
    };
  });

  describe('executeRecaptcha', () => {
    it('should execute reCAPTCHA and return token', async () => {
      Platform.OS = 'web';
      mockGrecaptcha.enterprise.execute.mockResolvedValue('test-token');

      const token = await executeRecaptcha('site-key', 'test-action');

      expect(token).toBe('test-token');
      expect(mockGrecaptcha.enterprise.ready).toHaveBeenCalled();
      expect(mockGrecaptcha.enterprise.execute).toHaveBeenCalledWith('site-key', {
        action: 'test-action',
      });
    });

    it('should throw error on non-web platform', async () => {
      Platform.OS = 'ios';

      await expect(executeRecaptcha('site-key', 'test-action')).rejects.toThrow(
        'reCAPTCHA is only available on web'
      );
    });

    it('should fallback to standard reCAPTCHA if enterprise fails', async () => {
      Platform.OS = 'web';
      mockGrecaptcha.enterprise.execute.mockRejectedValue(
        new Error('Invalid site key')
      );
      mockGrecaptcha.execute.mockResolvedValue('fallback-token');

      const token = await executeRecaptcha('site-key', 'test-action');

      expect(token).toBe('fallback-token');
      expect(mockGrecaptcha.execute).toHaveBeenCalled();
    });
  });

  describe('renderRecaptcha', () => {
    it('should render reCAPTCHA widget', async () => {
      Platform.OS = 'web';
      mockGrecaptcha.enterprise.render.mockReturnValue(123);

      const widgetId = await renderRecaptcha(
        'element-id',
        'site-key',
        jest.fn(),
        jest.fn(),
        jest.fn()
      );

      expect(widgetId).toBe(123);
      expect(mockGrecaptcha.enterprise.render).toHaveBeenCalled();
    });

    it('should throw error on non-web platform', async () => {
      Platform.OS = 'ios';

      await expect(
        renderRecaptcha('element-id', 'site-key', jest.fn())
      ).rejects.toThrow('reCAPTCHA is only available on web');
    });
  });

  describe('resetRecaptcha', () => {
    it('should reset reCAPTCHA widget', () => {
      Platform.OS = 'web';
      resetRecaptcha(123);

      expect(mockGrecaptcha.enterprise.reset).toHaveBeenCalledWith(123);
    });

    it('should do nothing on non-web platform', () => {
      Platform.OS = 'ios';
      resetRecaptcha(123);

      expect(mockGrecaptcha.enterprise.reset).not.toHaveBeenCalled();
    });
  });
});
