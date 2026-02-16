import { Platform } from 'react-native';
import { app, VAPID_PUBLIC_KEY } from '@/config/firebase';

// Lazy initialization to avoid module load order issues
function getMessagingInstance() {
  if (Platform.OS !== 'web' || !app) {
    return null;
  }
  try {
    const { getMessaging } = require('firebase/messaging');
    return getMessaging(app);
  } catch (err) {
    console.log('FCM not available:', err);
    return null;
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    animeId?: string;
    episodeNumber?: number;
    type?: 'new_episode' | 'news' | 'update';
  };
}

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return false;
      }

      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    // For native, use expo-notifications
    try {
      const Notifications = require('expo-notifications');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (err) {
      console.log('Expo notifications not available:', err);
      return false;
    }
  },

  async getFCMToken(): Promise<string | null> {
    const messaging = getMessagingInstance();
    if (Platform.OS === 'web' && messaging) {
      try {
        const { getToken } = require('firebase/messaging');
        // Use VAPID key from config (fallback to env var if needed)
        const vapidKey = VAPID_PUBLIC_KEY || process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.warn('VAPID key not configured. Web push notifications may not work.');
          return null;
        }
        const token = await getToken(messaging, {
          vapidKey,
        });
        return token;
      } catch (err) {
        console.error('Failed to get FCM token:', err);
        return null;
      }
    }

    // For native, use Expo push token
    if (Platform.OS !== 'web') {
      try {
        const Notifications = require('expo-notifications');
        const token = await Notifications.getExpoPushTokenAsync();
        return token.data;
      } catch (err) {
        console.error('Failed to get Expo push token:', err);
        return null;
      }
    }

    return null;
  },

  async registerForPushNotifications(userId: string): Promise<string | null> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.log('Notification permission denied');
      return null;
    }

    const token = await this.getFCMToken();
    if (token && Platform.OS === 'web' && app) {
      // Save token to Firestore for the user
      try {
        const { getFirestore, doc, setDoc } = require('firebase/firestore');
        const db = getFirestore(app);
        await setDoc(doc(db, 'users', userId, 'tokens', 'push'), {
          token,
          platform: Platform.OS,
          updatedAt: Date.now(),
        });
        console.log('Push token registered');
      } catch (err) {
        console.error('Failed to save push token:', err);
      }
    }

    return token;
  },

  setupForegroundHandler(callback: (payload: NotificationPayload) => void): () => void {
    const messaging = getMessagingInstance();
    if (Platform.OS === 'web' && messaging) {
      const { onMessage } = require('firebase/messaging');
      const unsubscribe = onMessage(messaging, (payload: any) => {
        callback({
          title: payload.notification?.title || '',
          body: payload.notification?.body || '',
          data: payload.data,
        });
      });
      return unsubscribe;
    }

    if (Platform.OS !== 'web') {
      try {
        const Notifications = require('expo-notifications');
        const subscription = Notifications.addNotificationReceivedListener(
          (notification: any) => {
            callback({
              title: notification.request.content.title || '',
              body: notification.request.content.body || '',
              data: notification.request.content.data,
            });
          }
        );
        return () => subscription.remove();
      } catch (err) {
        console.log('Expo notifications not available:', err);
      }
    }

    return () => {};
  },

  setupResponseHandler(callback: (animeId: string) => void): () => void {
    if (Platform.OS !== 'web') {
      try {
        const Notifications = require('expo-notifications');
        const subscription = Notifications.addNotificationResponseReceivedListener(
          (response: any) => {
            const animeId = response.notification.request.content.data?.animeId;
            if (animeId) {
              callback(animeId);
            }
          }
        );
        return () => subscription.remove();
      } catch (err) {
        console.log('Expo notifications not available:', err);
      }
    }

    return () => {};
  },

  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    if (Platform.OS === 'web') {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: '/icon-192.png',
        });
      }
      return;
    }

    // For native platforms
    try {
      const Notifications = require('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
        },
        trigger: null, // Show immediately
      });
    } catch (err) {
      console.log('Failed to show notification:', err);
    }
  },
};
