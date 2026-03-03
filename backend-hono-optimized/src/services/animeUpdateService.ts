import { getAnimeInfo, AnimeInfo } from './animeService.js';
import { firestoreDb, admin } from '../config/firebase.js';
import { sendPushToUser } from './pushNotificationService.js';
import { mapLimit } from '../utils/async.js';

const ANIME_INFO_CONCURRENCY = Number(process.env.ANIME_UPDATE_INFO_CONCURRENCY || 8);
const PUSH_CONCURRENCY = Number(process.env.ANIME_UPDATE_PUSH_CONCURRENCY || 10);

interface WatchingAnimeEntry {
  userId: string;
  animeId: string;
  animeName: string;
  totalEpisodes: number;
  ref: FirebaseFirestore.DocumentReference;
}

interface PendingUpdate {
  userId: string;
  animeId: string;
  animeName: string;
  latestEpisodeCount: number;
  ref: FirebaseFirestore.DocumentReference;
}

function extractEpisodeCount(info: AnimeInfo): number {
  return Number(info.episodes.sub ?? info.episodes.dub ?? 0);
}

function resolveUserIdFromSavedAnimeRef(ref: FirebaseFirestore.DocumentReference): string | null {
  const fromParent = ref.parent?.parent?.id;
  if (fromParent) {
    return fromParent;
  }

  const pathParts = ref.path.split('/');
  const userIndex = pathParts.indexOf('users');
  if (userIndex >= 0 && userIndex < pathParts.length - 1) {
    return pathParts[userIndex + 1];
  }

  return null;
}


/**
 * Check for anime updates for all users
 * This can be called via a cron job or scheduled task
 */
export async function checkAnimeUpdatesForAllUsers(): Promise<{
  totalUsers: number;
  totalAnime: number;
  updatesFound: number;
  uniqueAnimeChecked: number;
  notificationsCreated: number;
  newsCreated: number;
}> {
  if (!firestoreDb) {
    throw new Error('Firebase Admin not initialized. Please check your service account configuration.');
  }

  try {
    // Query all watching entries once, then deduplicate by anime ID before upstream API calls.
    const savedAnimeSnapshot = await firestoreDb
      .collectionGroup('savedAnime')
      .where('status', '==', 'watching')
      .get();

    const allWatchingUsers = new Set<string>();
    const watchingByAnimeId = new Map<string, WatchingAnimeEntry[]>();

    savedAnimeSnapshot.docs.forEach((doc) => {
      const userId = resolveUserIdFromSavedAnimeRef(doc.ref);
      if (!userId) {
        return;
      }

      allWatchingUsers.add(userId);
      const data = doc.data() as Record<string, any>;

      // Skip notification-disabled entries early so they are not part of update checks.
      if (data.notifyOnUpdate === false) {
        return;
      }

      const animeId = String(data.id || doc.id || '');
      if (!animeId) {
        return;
      }

      const entry: WatchingAnimeEntry = {
        userId,
        animeId,
        animeName: String(data.name || animeId),
        totalEpisodes: Number(data.totalEpisodes || 0),
        ref: doc.ref,
      };

      if (!watchingByAnimeId.has(animeId)) {
        watchingByAnimeId.set(animeId, []);
      }
      watchingByAnimeId.get(animeId)!.push(entry);
    });

    const animeIds = [...watchingByAnimeId.keys()];
    const latestEpisodesByAnimeId = new Map<string, number>();

    await mapLimit(animeIds, ANIME_INFO_CONCURRENCY, async (animeId) => {
      try {
        const info = await getAnimeInfo(animeId);
        if (!info) {
          return;
        }
        latestEpisodesByAnimeId.set(animeId, extractEpisodeCount(info));
      } catch (error) {
        console.error(`Error fetching anime info for ${animeId}:`, error);
      }
    });

    const pendingUpdates: PendingUpdate[] = [];
    for (const [animeId, watchers] of watchingByAnimeId.entries()) {
      const latestEpisodeCount = latestEpisodesByAnimeId.get(animeId);
      if (latestEpisodeCount === undefined) {
        continue;
      }

      for (const watcher of watchers) {
        if (latestEpisodeCount > watcher.totalEpisodes) {
          pendingUpdates.push({
            userId: watcher.userId,
            animeId: watcher.animeId,
            animeName: watcher.animeName,
            latestEpisodeCount,
            ref: watcher.ref,
          });
        }
      }
    }

    if (pendingUpdates.length === 0) {
      return {
        totalUsers: allWatchingUsers.size,
        totalAnime: savedAnimeSnapshot.size,
        updatesFound: 0,
        uniqueAnimeChecked: animeIds.length,
        notificationsCreated: 0,
        newsCreated: 0,
      };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const bulkWriter = firestoreDb.bulkWriter();
    bulkWriter.onWriteError((error) => {
      console.error('Bulk writer error:', error);
      return false;
    });

    const newsByAnimeId = new Map<string, { title: string; summary: string; animeId: string; animeName: string }>();

    for (const update of pendingUpdates) {
      const notifTitle = `New episode: ${update.animeName}`;
      const notifBody = `Episode ${update.latestEpisodeCount} is now available!`;

      bulkWriter.update(update.ref, {
        totalEpisodes: update.latestEpisodeCount,
        lastUpdated: now,
      });

      bulkWriter.create(firestoreDb.collection('notifications').doc(), {
        userId: update.userId,
        type: 'anime_new_episode',
        title: notifTitle,
        body: notifBody,
        data: {
          animeId: update.animeId,
          episodeNumber: update.latestEpisodeCount,
        },
        read: false,
        createdAt: now,
      });

      if (!newsByAnimeId.has(update.animeId)) {
        newsByAnimeId.set(update.animeId, {
          title: notifTitle,
          summary: notifBody,
          animeId: update.animeId,
          animeName: update.animeName,
        });
      }
    }

    for (const news of newsByAnimeId.values()) {
      bulkWriter.create(firestoreDb.collection('news').doc(), {
        ...news,
        type: 'new_episode',
        createdAt: Date.now(),
      });
    }

    await bulkWriter.close();

    await mapLimit(pendingUpdates, PUSH_CONCURRENCY, async (update) => {
      const title = `New episode: ${update.animeName}`;
      const body = `Episode ${update.latestEpisodeCount} is now available!`;
      await sendPushToUser(update.userId, title, body, {
        animeId: update.animeId,
        episodeNumber: String(update.latestEpisodeCount),
      });
    });

    return {
      totalUsers: allWatchingUsers.size,
      totalAnime: savedAnimeSnapshot.size,
      updatesFound: pendingUpdates.length,
      uniqueAnimeChecked: animeIds.length,
      notificationsCreated: pendingUpdates.length,
      newsCreated: newsByAnimeId.size,
    };
  } catch (error) {
    console.error('Error in anime update check:', error);
    throw error;
  }
}
