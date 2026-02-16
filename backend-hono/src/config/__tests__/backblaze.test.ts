import { describe, it, expect, beforeEach, jest } from 'jest';
import { getBackblazeClient, BACKBLAZE_BUCKET, getBackblazePublicUrl } from '../backblaze.js';
import { S3Client } from '@aws-sdk/client-s3';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');

describe('Backblaze Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getBackblazeClient', () => {
    it('should create S3 client with correct configuration', () => {
      process.env.BACKBLAZE_KEY_ID = 'test-key-id';
      process.env.BACKBLAZE_APPLICATION_KEY = 'test-app-key';
      process.env.BACKBLAZE_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.BACKBLAZE_REGION = 'us-east-005';

      // Re-import to get fresh module with new env vars
      jest.resetModules();
      const { getBackblazeClient } = require('../backblaze.js');

      const client = getBackblazeClient();

      expect(S3Client).toHaveBeenCalledWith({
        endpoint: 'https://s3.us-east-005.backblazeb2.com',
        region: 'us-east-005',
        credentials: {
          accessKeyId: 'test-key-id',
          secretAccessKey: 'test-app-key',
        },
        forcePathStyle: true,
      });
    });

    it('should throw error if credentials are missing', () => {
      delete process.env.BACKBLAZE_KEY_ID;
      delete process.env.BACKBLAZE_APPLICATION_KEY;

      jest.resetModules();
      const { getBackblazeClient } = require('../backblaze.js');

      expect(() => getBackblazeClient()).toThrow('Backblaze credentials not configured');
    });

    it('should return cached client on subsequent calls', () => {
      process.env.BACKBLAZE_KEY_ID = 'test-key-id';
      process.env.BACKBLAZE_APPLICATION_KEY = 'test-app-key';

      jest.resetModules();
      const { getBackblazeClient } = require('../backblaze.js');

      const client1 = getBackblazeClient();
      const client2 = getBackblazeClient();

      expect(client1).toBe(client2);
      expect(S3Client).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBackblazePublicUrl', () => {
    it('should generate correct public URL', () => {
      process.env.BACKBLAZE_BUCKET_NAME = 'test-bucket';
      process.env.BACKBLAZE_REGION = 'us-east-005';

      jest.resetModules();
      const { getBackblazePublicUrl } = require('../backblaze.js');

      const url = getBackblazePublicUrl('posts/user123/file.jpg');

      expect(url).toBe('https://test-bucket.s3.us-east-005.backblazeb2.com/posts/user123/file.jpg');
    });
  });

  describe('BACKBLAZE_BUCKET', () => {
    it('should use default bucket name if not set', () => {
      delete process.env.BACKBLAZE_BUCKET_NAME;

      jest.resetModules();
      const { BACKBLAZE_BUCKET } = require('../backblaze.js');

      expect(BACKBLAZE_BUCKET).toBe('anistream-bckt');
    });

    it('should use custom bucket name from env', () => {
      process.env.BACKBLAZE_BUCKET_NAME = 'custom-bucket';

      jest.resetModules();
      const { BACKBLAZE_BUCKET } = require('../backblaze.js');

      expect(BACKBLAZE_BUCKET).toBe('custom-bucket');
    });
  });
});
