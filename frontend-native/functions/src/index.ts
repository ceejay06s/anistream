import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Triggered whenever a new doc is added to the `notifications` collection.
 * Looks up the recipient's FCM token and sends a push notification via FCM.
 * This enables push notifications even when the browser tab / app is closed.
 */
export const sendPushOnNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap) => {
    const notification = snap.data();
    const userId: string = notification.userId;
    if (!userId) return;

    // Fetch the user's stored FCM / Expo push token
    const tokenSnap = await admin
      .firestore()
      .doc(`users/${userId}/tokens/push`)
      .get();

    if (!tokenSnap.exists) return;

    const { token, platform } = tokenSnap.data() as {
      token: string;
      platform: string;
    };
    if (!token) return;

    const animeId: string = notification.data?.animeId || '';
    const postId: string = notification.data?.postId || '';

    // Expo push tokens start with "ExponentPushToken[" — use Expo's push API
    if (token.startsWith('ExponentPushToken[')) {
      await sendExpoNotification(token, notification.title, notification.body, {
        animeId,
        postId,
        type: notification.type,
      });
      return;
    }

    // FCM token — send via Firebase Admin Messaging
    await admin.messaging().send({
      token,
      notification: {
        title: notification.title || 'AniStream',
        body: notification.body || '',
      },
      data: {
        animeId,
        postId,
        type: notification.type || '',
      },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: snap.id,
        },
        fcmOptions: {
          link: animeId ? `/detail/${animeId}` : postId ? `/community` : '/',
        },
      },
      android: {
        notification: {
          icon: 'notification_icon',
          color: '#e50914',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    });
  });

/** Send via Expo's push notification service (for native apps built with Expo Go / bare). */
async function sendExpoNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  const message = {
    to: token,
    sound: 'default' as const,
    title,
    body,
    data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}
