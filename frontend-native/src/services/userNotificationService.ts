import { Platform } from 'react-native';
import { app } from '@/config/firebase';
import { API_BASE_URL } from './api';

// Lazy initialization to avoid module load order issues
function getDb() {
  if (!app) {
    return null;
  }
  const { getFirestore } = require('firebase/firestore');
  return getFirestore(app);
}

export type NotificationType = 
  | 'post_anime_interest'      // New post about anime user is interested in
  | 'comment_on_post'          // Comment on user's post
  | 'comment_on_commented_post' // Comment on post user commented on
  | 'anime_new_episode'        // New episode released
  | 'anime_new_season';        // New season released

export interface UserNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    animeId?: string;
    postId?: string;
    commentId?: string;
    episodeNumber?: number;
    seasonNumber?: number;
    actorId?: string; // User who created the post/comment
    actorName?: string;
    actorPhoto?: string;
  };
  read: boolean;
  createdAt: number;
}

export const userNotificationService = {
  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: string, limit: number = 50): Promise<UserNotification[]> {
    const db = getDb();
    if (!db) {
      return [];
    }

    try {
      const { collection, query, where, orderBy, limit: limitQuery, getDocs } = require('firebase/firestore');
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limitQuery(limit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      return [];
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const db = getDb();
    if (!db) {
      return 0;
    }

    try {
      const { collection, query, where, getCountFromServer } = require('firebase/firestore');
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (err) {
      console.error('Failed to get unread count:', err);
      return 0;
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const db = getDb();
    if (!db) {
      return;
    }

    try {
      const { doc, updateDoc } = require('firebase/firestore');
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const db = getDb();
    if (!db) {
      return;
    }

    try {
      const { collection, query, where, getDocs, writeBatch } = require('firebase/firestore');
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const db = getDb();
    if (!db) {
      return;
    }

    try {
      const { doc, deleteDoc } = require('firebase/firestore');
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  },

  /**
   * Create a notification (called by backend/cloud functions)
   * This is typically called server-side, but can be used client-side for testing
   */
  async createNotification(notification: Omit<UserNotification, 'id' | 'read' | 'createdAt'>): Promise<void> {
    const db = getDb();
    if (!db) {
      return;
    }

    try {
      const { collection, addDoc } = require('firebase/firestore');
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        createdAt: Date.now(),
      });

      // Fire-and-forget: trigger FCM push via backend
      const secret = process.env.EXPO_PUBLIC_NOTIFY_API_SECRET;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (secret) headers['X-Secret-Token'] = secret;

      fetch(`${API_BASE_URL}/api/notifications/send-push`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          data: {
            animeId: notification.data?.animeId ?? '',
            postId: notification.data?.postId ?? '',
            type: notification.type,
          },
        }),
      }).catch((err) => console.log('Push notification failed (non-critical):', err));
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  },

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: UserNotification[]) => void
  ): () => void {
    const db = getDb();
    if (!db) {
      return () => {};
    }

    try {
      const { collection, query, where, orderBy, limit, onSnapshot } = require('firebase/firestore');
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        const notifications = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(notifications);
      });

      return unsubscribe;
    } catch (err) {
      console.error('Failed to subscribe to notifications:', err);
      return () => {};
    }
  },

  /**
   * Subscribe to unread count
   */
  subscribeToUnreadCount(
    userId: string,
    callback: (count: number) => void
  ): () => void {
    const db = getDb();
    if (!db) {
      return () => {};
    }

    try {
      const { collection, query, where, onSnapshot } = require('firebase/firestore');
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        callback(snapshot.size);
      });

      return unsubscribe;
    } catch (err) {
      console.error('Failed to subscribe to unread count:', err);
      return () => {};
    }
  },

  /**
   * Format time ago (reuse from communityService)
   */
  formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  },
};
