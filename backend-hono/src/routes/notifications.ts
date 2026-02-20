import { Hono } from 'hono';
import { checkAnimeUpdatesForAllUsers } from '../services/animeUpdateService.js';
import { admin, firestoreDb } from '../config/firebase.js';

export const notificationRoutes = new Hono();

/**
 * POST /api/notifications/check-anime-updates
 * Manually trigger anime update check for all users
 * Can be called by a cron job service
 * 
 * Optional: Add authentication/secret token for security
 */
notificationRoutes.post('/check-anime-updates', async (c) => {
  try {
    // Optional: Check for secret token
    const secretToken = c.req.header('X-Secret-Token');
    const expectedToken = process.env.ANIME_UPDATE_SECRET_TOKEN;
    
    if (expectedToken && secretToken !== expectedToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const result = await checkAnimeUpdatesForAllUsers();
    
    return c.json({
      success: true,
      ...result,
      message: `Checked ${result.totalAnime} anime for ${result.totalUsers} users. Found ${result.updatesFound} updates.`,
    });
  } catch (error: any) {
    console.error('Error checking anime updates:', error);
    return c.json(
      { 
        success: false, 
        error: error.message || 'Failed to check anime updates' 
      },
      500
    );
  }
});

/**
 * GET /api/notifications/check-anime-updates
 * Health check endpoint
 */
notificationRoutes.get('/check-anime-updates', async (c) => {
  return c.json({
    message: 'Anime update check endpoint',
    method: 'POST',
    description: 'Call POST /api/notifications/check-anime-updates to trigger update check',
  });
});

/**
 * POST /api/notifications/send-push
 * Send an FCM push notification to a user.
 * Called by the frontend immediately after writing a notification doc to Firestore.
 *
 * Body: { userId, title, body, data? }
 * Header: X-Secret-Token (matches NOTIFY_API_SECRET env var)
 */
notificationRoutes.post('/send-push', async (c) => {
  try {
    // Auth check
    const secret = c.req.header('X-Secret-Token');
    const expectedSecret = process.env.NOTIFY_API_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { userId, title, body, data } = await c.req.json<{
      userId: string;
      title: string;
      body: string;
      data?: Record<string, string>;
    }>();

    if (!userId || !title) {
      return c.json({ error: 'Missing userId or title' }, 400);
    }

    if (!firestoreDb) {
      return c.json({ error: 'Firebase not initialized' }, 500);
    }

    // Fetch the recipient's push token
    const tokenSnap = await firestoreDb.doc(`users/${userId}/tokens/push`).get();
    if (!tokenSnap.exists) {
      return c.json({ sent: false, reason: 'no_token' });
    }

    const tokenData = tokenSnap.data() as { token: string; platform: string } | undefined;
    const token = tokenData?.token;
    if (!token) {
      return c.json({ sent: false, reason: 'no_token' });
    }

    const animeId = data?.animeId ?? '';
    const postId = data?.postId ?? '';

    // Expo push token (native apps via Expo Go / standalone)
    if (token.startsWith('ExponentPushToken[')) {
      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title,
          body,
          data: data ?? {},
        }),
      });
      const expoResult = await expoRes.json();
      return c.json({ sent: true, platform: 'expo', result: expoResult });
    }

    // FCM token (web + native FCM)
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: data ?? {},
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `${userId}-${Date.now()}`,
        },
        fcmOptions: {
          link: animeId ? `/detail/${animeId}` : postId ? '/community' : '/',
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
        payload: { aps: { badge: 1, sound: 'default' } },
      },
    });

    return c.json({ sent: true, platform: 'fcm' });
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return c.json({ error: error.message ?? 'Failed to send push' }, 500);
  }
});
