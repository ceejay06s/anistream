// Jest globals are available in test environment
import { uploadRoutes } from '../upload.js';
import { getBackblazeClient, BACKBLAZE_BUCKET } from '../../config/backblaze.js';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock Backblaze config
jest.mock('../../config/backblaze.js');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('Upload Routes', () => {
  const mockS3Client = {
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getBackblazeClient as jest.Mock).mockReturnValue(mockS3Client);
    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.example.com/file.jpg');
  });

  describe('POST /file', () => {
    it('should upload file successfully', async () => {
      // Create a mock file
      const fileContent = Buffer.from('test image content');
      const file = new File([fileContent], 'test.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'test-user-123');
      formData.append('folder', 'posts');

      mockS3Client.send.mockResolvedValue({});

      const req = new Request('http://localhost/api/upload/file', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadRoutes.fetch(req);
      const data = await res.json() as { success: boolean; type?: string; filePath?: string; error?: string; message?: string };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe('image');
      expect(data.filePath).toContain('posts/test-user-123/');
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should reject files larger than 10MB', async () => {
      // Create a large mock file (11MB)
      const largeContent = Buffer.alloc(11 * 1024 * 1024);
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'test-user-123');

      const req = new Request('http://localhost/api/upload/file', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadRoutes.fetch(req);
      const data = await res.json() as { success: boolean; type?: string; filePath?: string; error?: string; message?: string };

      expect(res.status).toBe(400);
      expect(data.error).toContain('File size exceeds 10MB');
    });

    it('should reject non-image/video files', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'test-user-123');

      const req = new Request('http://localhost/api/upload/file', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadRoutes.fetch(req);
      const data = await res.json() as { success: boolean; type?: string; filePath?: string; error?: string; message?: string };

      expect(res.status).toBe(400);
      expect(data.error).toContain('Only image and video files are allowed');
    });

    it('should require userId', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);
      // Missing userId

      const req = new Request('http://localhost/api/upload/file', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadRoutes.fetch(req);
      const data = await res.json() as { success: boolean; type?: string; filePath?: string; error?: string; message?: string };

      expect(res.status).toBe(400);
      expect(data.error).toContain('User ID is required');
    });

    it('should handle upload errors', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'test-user-123');

      mockS3Client.send.mockRejectedValue(new Error('Upload failed'));

      const req = new Request('http://localhost/api/upload/file', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadRoutes.fetch(req);
      const data = await res.json() as { success: boolean; type?: string; filePath?: string; error?: string; message?: string };

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to upload file');
    });
  });

  describe('DELETE /file', () => {
    it('should delete file successfully', async () => {
      mockS3Client.send.mockResolvedValue({});

      const req = new Request('http://localhost/api/upload/file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: 'posts/user123/file.jpg' }),
      });

      const res = await uploadRoutes.fetch(req);
      const data = await res.json() as { success: boolean; type?: string; filePath?: string; error?: string; message?: string };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should require filePath', async () => {
      const req = new Request('http://localhost/api/upload/file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await uploadRoutes.fetch(req);
      const data = await res.json() as { success: boolean; type?: string; filePath?: string; error?: string; message?: string };

      expect(res.status).toBe(400);
      expect(data.error).toContain('File path is required');
    });
  });
});
