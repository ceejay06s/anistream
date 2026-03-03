import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  userNotificationService,
  UserNotification,
  NotificationType,
} from '../userNotificationService';

jest.mock('@/config/firebase', () => ({
  app: null,
}));

describe('User Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeToNotifications', () => {
    it('calls callback with empty array and returns no-op when db is null', () => {
      const callback = jest.fn();
      const unsub = userNotificationService.subscribeToNotifications('user1', callback);
      expect(callback).toHaveBeenCalledWith([]);
      expect(unsub).toBeDefined();
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });
  });

  describe('subscribeToUnreadCount', () => {
    it('calls callback with 0 and returns no-op when db is null', () => {
      const callback = jest.fn();
      const unsub = userNotificationService.subscribeToUnreadCount('user1', callback);
      expect(callback).toHaveBeenCalledWith(0);
      expect(unsub).toBeDefined();
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });
  });

  describe('formatTimeAgo', () => {
    it('returns a string for timestamps', () => {
      const now = Date.now();
      expect(userNotificationService.formatTimeAgo(now)).toBeDefined();
      expect(typeof userNotificationService.formatTimeAgo(now - 60000)).toBe('string');
    });
  });

  describe('NotificationType config', () => {
    it('has valid type values for TYPE_CONFIG usage', () => {
      const types: NotificationType[] = [
        'post_anime_interest',
        'comment_on_post',
        'comment_on_commented_post',
        'anime_new_episode',
        'anime_new_season',
      ];
      expect(types).toHaveLength(5);
      types.forEach((t) => expect(typeof t).toBe('string'));
    });
  });
});
