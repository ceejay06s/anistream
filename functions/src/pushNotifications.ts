import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

// Note: Firebase Admin SDK uses service account credentials for sending notifications
// VAPID keys are configured in Firebase Console (Project Settings → Cloud Messaging)
// The public key is used on the client side (already configured in frontend)
// Private key: COVAz3fM8Z8s_N5fc7UAacoZPez8XdBKh8mmxc7vnM8 (configure in Firebase Console)

/**
 * Send push notification to a user's device
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: {
    animeId?: string;
    postId?: string;
    commentId?: string;
    episodeNumber?: number;
    type?: string;
  }
): Promise<void> {
  try {
    // Get user's FCM tokens
    const tokensRef = db.collection('users').doc(userId).collection('tokens');
    const tokensSnapshot = await tokensRef.get();

    if (tokensSnapshot.empty) {
      console.log(`No FCM tokens found for user ${userId}`);
      return;
    }

    // Get all valid tokens (web and native)
    const tokens = tokensSnapshot.docs
      .map((doc) => doc.data().token)
      .filter((token) => token && typeof token === 'string');
    
    if (tokens.length === 0) {
      console.log(`No valid FCM tokens found for user ${userId}`);
      return;
    }

    // Prepare notification payload
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data: data ? {
        animeId: data.animeId || '',
        postId: data.postId || '',
        commentId: data.commentId || '',
        episodeNumber: data.episodeNumber?.toString() || '',
        type: data.type || '',
      } : {},
      tokens,
      webpush: {
        fcmOptions: {
          link: data?.animeId ? `https://anistream-pink.vercel.app/detail/${data.animeId}` : 'https://anistream-pink.vercel.app',
        },
        notification: {
          icon: 'https://anistream-pink.vercel.app/icon-192.png',
          badge: 'https://anistream-pink.vercel.app/icon-192.png',
        },
      },
    };

    // Send notification
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} notifications to user ${userId}`);
    
    if (response.failureCount > 0) {
      console.warn(`Failed to send ${response.failureCount} notifications`);
      // Remove invalid tokens
      const tokensSnapshot = await tokensRef.get();
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
          const invalidToken = tokens[idx];
          // Find and delete the document containing this token
          tokensSnapshot.docs.forEach((doc) => {
            if (doc.data().token === invalidToken) {
              doc.ref.delete();
            }
          });
        }
      });
    }
  } catch (error) {
    console.error(`Error sending push notification to user ${userId}:`, error);
  }
}

/**
 * Send push notification when a notification is created in Firestore
 * This triggers push notifications for new Firestore notifications
 */
export const onNotificationCreated = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    const notificationId = context.params.notificationId;

    // Only send push for unread notifications
    if (notification.read) {
      return null;
    }

    try {
      await sendPushNotification(
        notification.userId,
        notification.title,
        notification.body,
        notification.data
      );
      return null;
    } catch (error) {
      console.error(`Error sending push for notification ${notificationId}:`, error);
      return null;
    }
  });
