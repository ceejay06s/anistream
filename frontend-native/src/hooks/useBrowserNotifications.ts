import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { app } from '@/config/firebase';
import { notificationService } from '@/services/notificationService';

/**
 * Subscribes to the user's Firestore notifications collection and shows
 * browser push notifications (via the Web Notification API) when new
 * notifications arrive after the subscription was established.
 *
 * Works on web only. On native, expo-notifications handles this separately.
 */
export function useBrowserNotifications() {
  const { user } = useAuth();
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !user || !app) return;

    // Only request permission once per session
    if (!permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      notificationService.requestPermission().then((granted) => {
        if (granted) {
          // Store FCM token for future server-sent notifications
          notificationService.registerForPushNotifications(user.uid).catch(() => {});
        }
      });
    }

    // Only show notifications created AFTER we start listening
    const subscribeStart = Date.now();

    let unsubscribe: (() => void) | null = null;

    try {
      const {
        getFirestore,
        collection,
        query,
        where,
        limit,
        onSnapshot,
      } = require('firebase/firestore');

      const db = getFirestore(app);

      // Simple single-field query — avoids composite index requirement.
      // New-vs-old filtering is done client-side via docChanges() + subscribeStart.
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        limit(20)
      );

      unsubscribe = onSnapshot(q, (snapshot: any) => {
        snapshot.docChanges().forEach((change: any) => {
          if (change.type !== 'added') return;

          const n = change.doc.data();

          // Skip documents that existed before we subscribed (initial load)
          if (!n.createdAt || n.createdAt <= subscribeStart) return;

          if (Notification.permission === 'granted') {
            new Notification(n.title || 'AniStream', {
              body: n.body || '',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: change.doc.id,
              data: n.data,
            });
          }
        });
      });
    } catch (err) {
      console.log('Browser notifications unavailable:', err);
    }

    return () => {
      unsubscribe?.();
    };
  }, [user?.uid]);
}
