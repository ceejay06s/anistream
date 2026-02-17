import { app } from '@/config/firebase';
import { Anime } from './api';

// Lazy initialization to avoid module load order issues
function getDb() {
  if (!app) {
    return null;
  }
  const { getFirestore } = require('firebase/firestore');
  return getFirestore(app);
}

export type CollectionStatus = 'watching' | 'plan_to_watch' | 'completed' | 'on_hold' | 'dropped';

export interface SavedAnime extends Anime {
  savedAt: number;
  status: CollectionStatus;
  currentEpisode?: number;
  totalEpisodes?: number;
  notifyOnUpdate?: boolean;
  lastUpdated?: number;
}

export const COLLECTION_LABELS: Record<CollectionStatus, string> = {
  watching: 'Watching',
  plan_to_watch: 'Plan to Watch',
  completed: 'Completed',
  on_hold: 'On Hold',
  dropped: 'Dropped',
};

export const savedAnimeService = {
  async getSavedAnime(userId: string): Promise<SavedAnime[]> {
    const db = getDb();
    if (!db) {
      return [];
    }

    const { collection, query, orderBy, getDocs } = require('firebase/firestore');
    const q = query(
      collection(db, 'users', userId, 'savedAnime'),
      orderBy('savedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      status: 'watching' as CollectionStatus, // default for legacy entries
      ...doc.data(),
    }));
  },

  async getAnimeByStatus(userId: string, status: CollectionStatus): Promise<SavedAnime[]> {
    const db = getDb();
    if (!db) {
      return [];
    }

    const { collection, query, where, orderBy, getDocs } = require('firebase/firestore');
    const q = query(
      collection(db, 'users', userId, 'savedAnime'),
      where('status', '==', status),
      orderBy('savedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  async saveAnime(userId: string, anime: Anime, status: CollectionStatus = 'watching'): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    // Firestore doesn't accept undefined values, so we need to sanitize the data
    const sanitizedAnime: Record<string, any> = {};
    for (const [key, value] of Object.entries(anime)) {
      if (value !== undefined) {
        sanitizedAnime[key] = value;
      }
    }

    const { doc, setDoc } = require('firebase/firestore');
    await setDoc(doc(db, 'users', userId, 'savedAnime', anime.id), {
      ...sanitizedAnime,
      status,
      savedAt: Date.now(),
      lastUpdated: Date.now(),
      notifyOnUpdate: true,
    });
  },

  async updateAnimeStatus(userId: string, animeId: string, status: CollectionStatus): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    const { doc, updateDoc } = require('firebase/firestore');
    await updateDoc(doc(db, 'users', userId, 'savedAnime', animeId), {
      status,
      lastUpdated: Date.now(),
    });
  },

  async updateEpisodeProgress(userId: string, animeId: string, currentEpisode: number): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    const { doc, updateDoc } = require('firebase/firestore');
    await updateDoc(doc(db, 'users', userId, 'savedAnime', animeId), {
      currentEpisode,
      lastUpdated: Date.now(),
    });
  },

  async updateAnimeProgress(
    userId: string,
    animeId: string,
    updates: { totalEpisodes?: number; currentEpisode?: number; lastUpdated?: number }
  ): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    const { doc, updateDoc } = require('firebase/firestore');
    const updateData: any = {
      lastUpdated: updates.lastUpdated || Date.now(),
    };
    
    if (updates.totalEpisodes !== undefined) {
      updateData.totalEpisodes = updates.totalEpisodes;
    }
    
    if (updates.currentEpisode !== undefined) {
      updateData.currentEpisode = updates.currentEpisode;
    }

    await updateDoc(doc(db, 'users', userId, 'savedAnime', animeId), updateData);
  },

  async toggleNotifications(userId: string, animeId: string, notify: boolean): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    const { doc, updateDoc } = require('firebase/firestore');
    await updateDoc(doc(db, 'users', userId, 'savedAnime', animeId), {
      notifyOnUpdate: notify,
    });
  },

  async unsaveAnime(userId: string, animeId: string): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    const { doc, deleteDoc } = require('firebase/firestore');
    await deleteDoc(doc(db, 'users', userId, 'savedAnime', animeId));
  },

  async isAnimeSaved(userId: string, animeId: string): Promise<boolean> {
    const db = getDb();
    if (!db) {
      return false;
    }

    const { doc, getDoc } = require('firebase/firestore');
    const docSnap = await getDoc(doc(db, 'users', userId, 'savedAnime', animeId));
    return docSnap.exists();
  },

  async getAnimeStatus(userId: string, animeId: string): Promise<SavedAnime | null> {
    const db = getDb();
    if (!db) {
      return null;
    }

    const { doc, getDoc } = require('firebase/firestore');
    const docSnap = await getDoc(doc(db, 'users', userId, 'savedAnime', animeId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SavedAnime;
    }
    return null;
  },

  async toggleSaveAnime(userId: string, anime: Anime, status: CollectionStatus = 'watching'): Promise<boolean> {
    const isSaved = await this.isAnimeSaved(userId, anime.id);
    if (isSaved) {
      await this.unsaveAnime(userId, anime.id);
      return false;
    } else {
      await this.saveAnime(userId, anime, status);
      return true;
    }
  },

  async getWatchingWithUpdates(userId: string): Promise<SavedAnime[]> {
    const db = getDb();
    if (!db) {
      return [];
    }

    const { collection, query, where, getDocs } = require('firebase/firestore');
    const q = query(
      collection(db, 'users', userId, 'savedAnime'),
      where('notifyOnUpdate', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },
};
