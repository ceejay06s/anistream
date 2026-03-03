import { admin, firestoreDb } from '../config/firebase.js';

export interface PushSendResult {
  sent: boolean;
  sentCount: number;
  totalTokens: number;
  expoTokens: number;
  fcmTokens: number;
}

function splitPushTokens(tokens: string[]): { expoTokens: string[]; fcmTokens: string[] } {
  const expoTokens = tokens.filter((token) => token.startsWith('ExponentPushToken['));
  const fcmTokens = tokens.filter((token) => !token.startsWith('ExponentPushToken['));

  return { expoTokens, fcmTokens };
}

export async function getUserPushTokens(userId: string): Promise<string[]> {
  if (!firestoreDb || !userId) {
    return [];
  }

  const tokenSnapshot = await firestoreDb.collection(`users/${userId}/tokens`).get();
  if (tokenSnapshot.empty) {
    return [];
  }

  return tokenSnapshot.docs
    .map((doc) => doc.data()?.token as string | undefined)
    .filter((token): token is string => Boolean(token && typeof token === 'string'));
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<PushSendResult> {
  if (!firestoreDb || !admin || !userId || !title) {
    return {
      sent: false,
      sentCount: 0,
      totalTokens: 0,
      expoTokens: 0,
      fcmTokens: 0,
    };
  }

  try {
    const tokens = await getUserPushTokens(userId);
    if (tokens.length === 0) {
      return {
        sent: false,
        sentCount: 0,
        totalTokens: 0,
        expoTokens: 0,
        fcmTokens: 0,
      };
    }

    const { expoTokens, fcmTokens } = splitPushTokens(tokens);
    const animeId = data.animeId ?? '';
    const postId = data.postId ?? '';
    let sentCount = 0;

    if (expoTokens.length > 0) {
      await Promise.all(
        expoTokens.map(async (token) => {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: token,
              sound: 'default',
              title,
              body,
              data,
            }),
          });
        })
      );
      sentCount += expoTokens.length;
    }

    if (fcmTokens.length > 0) {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data,
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
            color: '#e50914',
            channelId: 'default',
          },
        },
        apns: {
          payload: { aps: { badge: 1, sound: 'default' } },
        },
      });
      sentCount += response.successCount;
    }

    return {
      sent: sentCount > 0,
      sentCount,
      totalTokens: tokens.length,
      expoTokens: expoTokens.length,
      fcmTokens: fcmTokens.length,
    };
  } catch (error) {
    console.error(`Failed to send push notification to ${userId}:`, error);
    return {
      sent: false,
      sentCount: 0,
      totalTokens: 0,
      expoTokens: 0,
      fcmTokens: 0,
    };
  }
}
