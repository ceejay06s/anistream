// Firebase Cloud Messaging Service Worker
// Handles push notifications when the app is in background or closed

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDYyLlE_xE_d_f5E0ppooxJywN8xyR_7_s",
  authDomain: "aniwatch-76fd3.firebaseapp.com",
  projectId: "aniwatch-76fd3",
  storageBucket: "aniwatch-76fd3.firebasestorage.app",
  messagingSenderId: "797841167253",
  appId: "1:797841167253:web:d1e663cdc81467a3059c9c",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'AniStream';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
    tag: payload.data?.animeId || 'anistream-notification',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);
  event.notification.close();

  const animeId = event.notification.data?.animeId;
  const urlToOpen = animeId ? `/detail/${animeId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (animeId) {
            client.postMessage({ type: 'NOTIFICATION_CLICK', animeId });
          }
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
