import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { fetchAnimeInfo } from './animeApi';

const db = admin.firestore();

/**
 * Scheduled function to check for anime updates daily
 * Runs every day at 2 AM UTC (adjust timezone as needed)
 */
export const checkAnimeUpdates = functions.pubsub
  .schedule('0 2 * * *') // Every day at 2 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting daily anime update check...');

    try {
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      let totalUpdates = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        try {
          // Get user's saved anime with notifications enabled
          const savedAnimeSnapshot = await db
            .collection(`users/${userId}/savedAnime`)
            .where('status', '==', 'watching')
            .get();

          for (const savedDoc of savedAnimeSnapshot.docs) {
            const savedAnime = savedDoc.data();

            // Skip if notifications disabled
            if (savedAnime.notifyOnUpdate === false) {
              continue;
            }

            try {
              // Fetch current anime info from API
              const currentInfo = await fetchAnimeInfo(savedAnime.id);

              if (!currentInfo) {
                continue;
              }

              const currentEpisodes = currentInfo.episodes.sub || currentInfo.episodes.dub || 0;
              const lastKnownEpisodes = savedAnime.totalEpisodes || 0;

              // Check for new episodes
              if (currentEpisodes > lastKnownEpisodes) {
                // Create notification
                await db.collection('notifications').add({
                  userId,
                  type: 'anime_new_episode',
                  title: `New episode: ${savedAnime.name}`,
                  body: `Episode ${currentEpisodes} is now available!`,
                  data: {
                    animeId: savedAnime.id,
                    episodeNumber: currentEpisodes,
                  },
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Update saved anime with new episode count
                await savedDoc.ref.update({
                  totalEpisodes: currentEpisodes,
                  lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                });

                totalUpdates++;
                console.log(`Found update for ${savedAnime.name} (${savedAnime.id})`);
              }
            } catch (error) {
              console.error(`Error checking anime ${savedAnime.id} for user ${userId}:`, error);
              // Continue with next anime
            }
          }
        } catch (error) {
          console.error(`Error processing user ${userId}:`, error);
          // Continue with next user
        }
      }

      console.log(`Anime update check completed. Found ${totalUpdates} updates.`);
      return null;
    } catch (error) {
      console.error('Error in scheduled anime update check:', error);
      return null;
    }
  });

/**
 * HTTP function to manually trigger anime update check
 * Useful for testing: https://your-region-your-project.cloudfunctions.net/manualAnimeUpdateCheck
 */
export const manualAnimeUpdateCheck = functions.https.onRequest(async (req, res) => {
  // Optional: Add authentication check here
  // if (req.headers.authorization !== 'Bearer YOUR_SECRET_TOKEN') {
  //   res.status(401).send('Unauthorized');
  //   return;
  // }

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    let totalUpdates = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Get user's saved anime
      const savedAnimeSnapshot = await db
        .collection(`users/${userId}/savedAnime`)
        .where('status', '==', 'watching')
        .get();

      for (const savedDoc of savedAnimeSnapshot.docs) {
        const savedAnime = savedDoc.data();

        if (savedAnime.notifyOnUpdate === false) {
          continue;
        }

        // Fetch current anime info from API
        const currentInfo = await fetchAnimeInfo(savedAnime.id);

        if (!currentInfo) {
          continue;
        }

        const currentEpisodes = currentInfo.episodes.sub || currentInfo.episodes.dub || 0;
        const lastKnownEpisodes = savedAnime.totalEpisodes || 0;

        if (currentEpisodes > lastKnownEpisodes) {
          await db.collection('notifications').add({
            userId,
            type: 'anime_new_episode',
            title: `New episode: ${savedAnime.name}`,
            body: `Episode ${currentEpisodes} is now available!`,
            data: {
              animeId: savedAnime.id,
              episodeNumber: currentEpisodes,
            },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          await savedDoc.ref.update({
            totalEpisodes: currentEpisodes,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });

          totalUpdates++;
        }
      }
    }

    res.json({ success: true, updatesFound: totalUpdates });
  } catch (error) {
    console.error('Error in manual anime update check:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
