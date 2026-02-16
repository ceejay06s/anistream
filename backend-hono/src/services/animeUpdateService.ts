import { getAnimeInfo, AnimeInfo } from './animeService.js';
import { firestoreDb, admin } from '../config/firebase.js';


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

            // Create notification using Firebase Admin
            if (admin && firestoreDb) {
              notifications.push(
                firestoreDb.collection('notifications').add({
                  userId,
                  type: 'anime_new_episode',
                  title: `New episode: ${anime.data.name}`,
                  body: `Episode ${currentEpisodes} is now available!`,
                  data: {
                    animeId: anime.data.id,
                    episodeNumber: currentEpisodes,
                  },
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                })
              );

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
