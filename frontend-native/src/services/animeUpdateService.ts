import { Platform } from 'react-native';
import { app } from '@/config/firebase';
import { animeApi, AnimeInfo } from './api';
import { savedAnimeService, SavedAnime } from './savedAnimeService';
import { userNotificationService } from './userNotificationService';

// Lazy initialization
function getDb() {
  if (Platform.OS !== 'web' || !app) {
    return null;
  }
  const { getFirestore } = require('firebase/firestore');
  return getFirestore(app);
}

export interface AnimeUpdate {
  animeId: string;
  animeName: string;
  type: 'new_episode' | 'new_season';
  episodeNumber?: number;
  seasonNumber?: number;
  detectedAt: number;
}

export const animeUpdateService = {
  /**
   * Check for anime updates for a user's saved anime
   * This should be called periodically (e.g., daily) or via Cloud Functions
   */
  async checkAnimeUpdates(userId: string): Promise<void> {
    const db = getDb();
    if (!db) {
      return;
    }

    try {
      // Get user's saved anime with notifications enabled
      const savedAnime = await savedAnimeService.getSavedAnime(userId);
      const watchingAnime = savedAnime.filter(
        (anime) => anime.status === 'watching' && anime.notifyOnUpdate !== false
      );

      const notifications = [];

      for (const saved of watchingAnime) {
        try {
          // Get current anime info from API
          const currentInfo = await animeApi.getInfo(saved.id);
          
          if (!currentInfo) {
            continue;
          }

          // Check for new episodes
          const currentEpisodes = currentInfo.episodes.sub || currentInfo.episodes.dub || 0;
          const lastKnownEpisodes = saved.totalEpisodes || 0;

          if (currentEpisodes > lastKnownEpisodes) {
            // New episode(s) detected
            const newEpisodeNumber = currentEpisodes;
            
            notifications.push(
              userNotificationService.createNotification({
                userId,
                type: 'anime_new_episode',
                title: `New episode: ${saved.name}`,
                body: `Episode ${newEpisodeNumber} is now available!`,
                data: {
                  animeId: saved.id,
                  episodeNumber: newEpisodeNumber,
                },
              })
            );

            // Update saved anime with new episode count
            await savedAnimeService.updateAnimeProgress(userId, saved.id, {
              totalEpisodes: currentEpisodes,
              lastUpdated: Date.now(),
            });
          }

          // Check for new season (simplified - in production, you'd have better season detection)
          // This is a placeholder - you'd need to track seasons separately
          
        } catch (err) {
          console.error(`Failed to check updates for anime ${saved.id}:`, err);
          // Continue with other anime
        }
      }

      // All notifications are created asynchronously
      console.log(`Checked ${watchingAnime.length} anime, found ${notifications.length} updates`);
    } catch (err) {
      console.error('Failed to check anime updates:', err);
    }
  },

  /**
   * Check updates for a specific anime
   */
  async checkAnimeUpdate(userId: string, animeId: string): Promise<AnimeUpdate | null> {
    try {
      const savedAnime = await savedAnimeService.getSavedAnime(userId);
      const anime = savedAnime.find((a) => a.id === animeId);

      if (!anime || anime.notifyOnUpdate === false) {
        return null;
      }

      const currentInfo = await animeApi.getInfo(animeId);
      if (!currentInfo) {
        return null;
      }

      const currentEpisodes = currentInfo.episodes.sub || currentInfo.episodes.dub || 0;
      const lastKnownEpisodes = anime.totalEpisodes || 0;

      if (currentEpisodes > lastKnownEpisodes) {
        return {
          animeId,
          animeName: anime.name,
          type: 'new_episode',
          episodeNumber: currentEpisodes,
          detectedAt: Date.now(),
        };
      }

      return null;
    } catch (err) {
      console.error(`Failed to check update for anime ${animeId}:`, err);
      return null;
    }
  },

  /**
   * Manually trigger update check (for testing or manual refresh)
   */
  async triggerUpdateCheck(userId: string): Promise<number> {
    const db = getDb();
    if (!db) {
      return 0;
    }

    try {
      const savedAnime = await savedAnimeService.getSavedAnime(userId);
      const watchingAnime = savedAnime.filter(
        (anime) => anime.status === 'watching' && anime.notifyOnUpdate !== false
      );

      let updateCount = 0;

      for (const saved of watchingAnime) {
        const update = await this.checkAnimeUpdate(userId, saved.id);
        if (update) {
          updateCount++;
          
          // Create notification
          await userNotificationService.createNotification({
            userId,
            type: update.type,
            title: update.type === 'new_episode' 
              ? `New episode: ${update.animeName}`
              : `New season: ${update.animeName}`,
            body: update.type === 'new_episode'
              ? `Episode ${update.episodeNumber} is now available!`
              : `Season ${update.seasonNumber} is now available!`,
            data: {
              animeId: update.animeId,
              episodeNumber: update.episodeNumber,
              seasonNumber: update.seasonNumber,
            },
          });
        }
      }

      return updateCount;
    } catch (err) {
      console.error('Failed to trigger update check:', err);
      return 0;
    }
  },
};
