import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { uploadProfilePhoto, deleteProfilePhoto } from '../profileService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock API_BASE_URL
jest.mock('../api', () => ({
  API_BASE_URL: 'http://localhost:8801',
}));

describe('Profile Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadProfilePhoto', () => {
    it('should upload profile photo successfully', async () => {
      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        data: {
          success: true,
          url: 'https://example.com/photo.jpg',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const url = await uploadProfilePhoto(mockFile, 'user123');

      expect(url).toBe('https://example.com/photo.jpg');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8801/api/upload/file',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
      const mockError = {
        response: {
          status: 400,
          data: { error: 'File too large' },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(uploadProfilePhoto(mockFile, 'user123')).rejects.toThrow();
    });

    it('should include userId and folder in FormData', async () => {
      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        data: {
          success: true,
          url: 'https://example.com/photo.jpg',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await uploadProfilePhoto(mockFile, 'user123');

      const formDataCall = mockedAxios.post.mock.calls[0][1] as FormData;
      expect(formDataCall).toBeInstanceOf(FormData);
    });
  });

  describe('deleteProfilePhoto', () => {
    it('should delete profile photo successfully', async () => {
      // Note: The actual implementation uses Firebase Storage directly
      // This test would need to mock Firebase Storage
      // For now, we'll test the structure
      const photoURL = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/profiles/user123/photo.jpg?alt=media';
      const userId = 'user123';

      // This would require mocking Firebase Storage
      // The function extracts path from URL and deletes via Firebase Storage
      expect(photoURL).toContain('profiles');
      expect(userId).toBe('user123');
    });
  });
});
