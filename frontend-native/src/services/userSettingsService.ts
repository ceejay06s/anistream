import { app } from '@/config/firebase';

// Lazy initialization to avoid module load order issues
function getDb() {
  if (!app) {
    return null;
  }
  const { getFirestore } = require('firebase/firestore');
  return getFirestore(app);
}

export interface UserSettings {
  notificationsEnabled: boolean;
  autoPlayEnabled: boolean;
  updatedAt: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  notificationsEnabled: false,
  autoPlayEnabled: true,
  updatedAt: Date.now(),
};

export const userSettingsService = {
  async getSettings(userId: string): Promise<UserSettings> {
    const db = getDb();
    if (!db) {
      return DEFAULT_SETTINGS;
    }

    try {
      const { doc, getDoc } = require('firebase/firestore');
      const docSnap = await getDoc(doc(db, 'users', userId, 'settings', 'preferences'));

      if (docSnap.exists()) {
        return { ...DEFAULT_SETTINGS, ...docSnap.data() };
      }
      return DEFAULT_SETTINGS;
    } catch (err) {
      console.error('Failed to load user settings:', err);
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    try {
      const { doc, setDoc } = require('firebase/firestore');
      await setDoc(
        doc(db, 'users', userId, 'settings', 'preferences'),
        {
          ...settings,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to save user settings:', err);
      throw err;
    }
  },

  async setNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
    return this.updateSettings(userId, { notificationsEnabled: enabled });
  },

  async setAutoPlayEnabled(userId: string, enabled: boolean): Promise<void> {
    return this.updateSettings(userId, { autoPlayEnabled: enabled });
  },
};
