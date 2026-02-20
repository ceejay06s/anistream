import { getAnimeInfo, AnimeInfo } from './animeService.js';
import { firestoreDb, admin } from '../config/firebase.js';

/** Send a push notification to a user (Expo or FCM) */
async function sendPushToUser(userId: string, title: string, body: string, data: Record<string, string>) {
  if (!firestoreDb || !admin) return;
  try {
    const tokenSnap = await firestoreDb.doc(`users/${userId}/tokens/push`).get();
    if (!tokenSnap.exists) return;
    const tokenData = tokenSnap.data() as { token: string } | undefined;
    const token = tokenData?.token;
    if (!token) return;

    if (token.startsWith('ExponentPushToken[')) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: token, sound: 'default', title, body, data }),
      });
    } else {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
        android: { notification: { icon: 'notification_icon', color: '#e50914', channelId: 'default' } },
        apns: { payload: { aps: { badge: 1, sound: 'default' } } },
      });
    }
  } catch (err) {
    console.error(`Failed to send push to user ${userId}:`, err);
  }
}


/**
 * Check for anime updates for all users
 * This can be called via a cron job or scheduled task
 */
export async function checkAnimeUpdatesForAllUsers(): Promise<{
  totalUsers: number;
  totalAnime: number;
  updatesFound: number;
}> {
  if (!firestoreDb) {
    throw new Error('Firebase Admin not initialized. Please check your service account configuration.');
  }

  try {
    // Get all users with saved anime using collection group
    const savedAnimeSnapshot = await firestoreDb
      .collectionGroup('savedAnime')
      .where('status', '==', 'watching')
      .get();
    
    const userAnimeMap = new Map<string, Array<{ id: string; data: any; ref: any }>>();
    
    // Group anime by user
    savedAnimeSnapshot.docs.forEach((doc: any) => {
      const pathParts = doc.ref.path.split('/');
      const userIdIndex = pathParts.indexOf('users');
      const userId = userIdIndex >= 0 && userIdIndex < pathParts.length - 1
        ? pathParts[userIdIndex + 1]
        : null;
      
      if (userId) {
        if (!userAnimeMap.has(userId)) {
          userAnimeMap.set(userId, []);
        }
        userAnimeMap.get(userId)!.push({
          id: doc.id,
          data: doc.data(),
          ref: doc.ref,
        });
      }
    });

    let totalAnime = 0;
    let updatesFound = 0;
    const notifications: Promise<any>[] = [];

    // Check each user's anime
    for (const [userId, animeList] of userAnimeMap.entries()) {
      for (const anime of animeList) {
        // Skip if notifications disabled
        if (anime.data.notifyOnUpdate === false) {
          continue;
        }

        totalAnime++;

        try {
          // Get current anime info from API
          const currentInfo = await getAnimeInfo(anime.data.id);
          
          if (!currentInfo) {
            continue;
          }

          const currentEpisodes = currentInfo.episodes.sub || currentInfo.episodes.dub || 0;
          const lastKnownEpisodes = anime.data.totalEpisodes || 0;

          // Check for new episodes
          if (currentEpisodes > lastKnownEpisodes) {
            updatesFound++;

            if (admin && firestoreDb) {
              const notifTitle = `New episode: ${anime.data.name}`;
              const notifBody = `Episode ${currentEpisodes} is now available!`;
              const notifData = { animeId: anime.data.id, episodeNumber: String(currentEpisodes) };

              // Write to notifications collection
              notifications.push(
                firestoreDb.collection('notifications').add({
                  userId,
                  type: 'anime_new_episode',
                  title: notifTitle,
                  body: notifBody,
                  data: { animeId: anime.data.id, episodeNumber: currentEpisodes },
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                })
              );

              // Write to news collection (shown on home screen)
              notifications.push(
                firestoreDb.collection('news').add({
                  title: notifTitle,
                  summary: notifBody,
                  animeId: anime.data.id,
                  animeName: anime.data.name,
                  type: 'new_episode',
                  createdAt: Date.now(),
                })
              );

              // Send push notification directly
              notifications.push(sendPushToUser(userId, notifTitle, notifBody, notifData));

              // Update saved anime with new episode count
              await anime.ref.update({
                totalEpisodes: currentEpisodes,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        } catch (error) {
          console.error(`Error checking anime ${anime.data.id} for user ${userId}:`, error);
          // Continue with next anime
        }
      }
    }

    await Promise.all(notifications);

    return {
      totalUsers: userAnimeMap.size,
      totalAnime,
      updatesFound,
    };
  } catch (error) {
    console.error('Error in anime update check:', error);
    throw error;
  }
}
