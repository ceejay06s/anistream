import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/services/notificationService';

/**
 * Sets up Expo push notifications for Android/iOS:
 * - Requests permission and registers Expo push token on login
 * - Configures foreground notification display
 * - Navigates to anime detail screen when user taps a notification
 */
export function useNativeNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const registeredRef = useRef(false);

  // Configure foreground handler + notification tap navigation
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Show notification alert/sound/badge even when app is in foreground
    try {
      const Notifications = require('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (err) {
      console.log('expo-notifications not available:', err);
    }

    // Navigate when user taps a notification
    const cleanup = notificationService.setupResponseHandler((animeId) => {
      if (animeId) {
        router.push(`/detail/${animeId}` as any);
      }
    });

    return cleanup;
  }, []);

  // Register push token when user logs in
  useEffect(() => {
    if (Platform.OS === 'web' || !user || registeredRef.current) return;
    registeredRef.current = true;
    notificationService.registerForPushNotifications(user.uid).catch(() => {});
  }, [user?.uid]);
}
