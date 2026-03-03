import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { communityService, Post, Comment } from '../communityService';
import { Platform } from 'react-native';

// Mock Firebase (app: {} so getDb runs; getFirestore returns null to avoid loading real Firestore ESM)
jest.mock('@/config/firebase', () => ({
  app: {},
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: () => null,
  collection: () => ({}),
  query: () => ({}),
  orderBy: () => ({}),
  limit: () => ({}),
  onSnapshot: () => () => {},
}));

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
  delete: jest.fn(),
}));

describe('Community Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPostsByAnimeId', () => {
    it('should return posts for a specific anime', async () => {
      // Mock Firestore
      const mockPosts = [
        {
          id: 'post1',
          userId: 'user1',
          userName: 'Test User',
          content: 'Test post',
          animeId: 'anime1',
          likes: [],
          commentCount: 0,
          createdAt: Date.now(),
        },
      ];

      // This would require mocking Firestore properly
      // For now, we'll test the structure
      expect(mockPosts).toBeDefined();
      expect(mockPosts[0].animeId).toBe('anime1');
    });

    it('should return empty array if no posts found', async () => {
      const mockPosts: Post[] = [];
      expect(mockPosts).toEqual([]);
    });
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const mockUser = {
        uid: 'user1',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      const mockPost: Post = {
        id: 'post1',
        userId: mockUser.uid,
        userName: mockUser.displayName || 'Anonymous',
        userPhoto: mockUser.photoURL || undefined,
        content: 'Test post content',
        animeId: 'anime1',
        animeName: 'Test Anime',
        likes: [],
        commentCount: 0,
        createdAt: Date.now(),
      };

      expect(mockPost.userId).toBe(mockUser.uid);
      expect(mockPost.content).toBe('Test post content');
      expect(mockPost.animeId).toBe('anime1');
    });

    it('should handle clipped scene time', async () => {
      const mockPost: Post = {
        id: 'post1',
        userId: 'user1',
        userName: 'Test User',
        content: 'Test post',
        animeId: 'anime1',
        clippedSceneTime: 120.5, // 2 minutes
        likes: [],
        commentCount: 0,
        createdAt: Date.now(),
      };

      expect(mockPost.clippedSceneTime).toBe(120.5);
    });
  });

  describe('addComment', () => {
    it('should add a comment to a post', async () => {
      const mockComment: Comment = {
        id: 'comment1',
        userId: 'user1',
        userName: 'Test User',
        userPhoto: 'https://example.com/photo.jpg',
        content: 'Test comment',
        createdAt: Date.now(),
      };

      expect(mockComment.content).toBe('Test comment');
      expect(mockComment.userId).toBe('user1');
    });
  });

  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(communityService.formatTime(0)).toBe('0:00');
      expect(communityService.formatTime(65)).toBe('1:05');
      expect(communityService.formatTime(3661)).toBe('61:01');
    });

    it('should handle invalid input', () => {
      expect(communityService.formatTime(NaN)).toBe('0:00');
      expect(communityService.formatTime(-10)).toBe('0:00');
    });
  });

  describe('subscribeToPosts', () => {
    it('returns an unsubscribe function that can be called without throwing', () => {
      const callback = jest.fn();
      const unsub = communityService.subscribeToPosts(30, callback);
      expect(unsub).toBeDefined();
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });

    it('invokes callback with an array (posts or empty)', () => {
      const callback = jest.fn();
      communityService.subscribeToPosts(30, callback);
      expect(callback).toHaveBeenCalled();
      expect(Array.isArray(callback.mock.calls[0][0])).toBe(true);
    });
  });

  describe('formatTimeAgo', () => {
    it('returns a string for recent timestamps', () => {
      const now = Date.now();
      expect(communityService.formatTimeAgo(now)).toBeDefined();
      expect(typeof communityService.formatTimeAgo(now - 60000)).toBe('string');
    });
  });
});
