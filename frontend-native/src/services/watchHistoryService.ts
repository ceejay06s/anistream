import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WatchHistoryEntry {
  animeId: string;
  animeName: string;
  animePoster?: string;
  episodeId: string;
  episodeNumber: string;
  timestamp: number; // Current playback position in seconds
  duration?: number; // Total duration in seconds
  watchedAt: number; // When this was last watched
}

const WATCH_HISTORY_KEY = '@watch_history';
const MAX_HISTORY_ENTRIES = 50;

export const watchHistoryService = {
  // Get all watch history entries
  async getHistory(): Promise<WatchHistoryEntry[]> {
    try {
      const data = await AsyncStorage.getItem(WATCH_HISTORY_KEY);
      if (!data) return [];
      const history = JSON.parse(data) as WatchHistoryEntry[];
      // Sort by most recently watched
      return history.sort((a, b) => b.watchedAt - a.watchedAt);
    } catch (err) {
      console.error('Failed to get watch history:', err);
      return [];
    }
  },

  // Get watch progress for a specific episode
  async getProgress(animeId: string, episodeNumber: string): Promise<WatchHistoryEntry | null> {
    try {
      const history = await this.getHistory();
      return history.find(
        entry => entry.animeId === animeId && entry.episodeNumber === episodeNumber
      ) || null;
    } catch (err) {
      console.error('Failed to get watch progress:', err);
      return null;
    }
  },

  // Save watch progress
  async saveProgress(entry: Omit<WatchHistoryEntry, 'watchedAt'>): Promise<void> {
    try {
      const history = await this.getHistory();

      // Find existing entry for this episode
      const existingIndex = history.findIndex(
        e => e.animeId === entry.animeId && e.episodeNumber === entry.episodeNumber
      );

      const newEntry: WatchHistoryEntry = {
        ...entry,
        watchedAt: Date.now(),
      };

      if (existingIndex >= 0) {
        // Update existing entry
        history[existingIndex] = newEntry;
      } else {
        // Add new entry at the beginning
        history.unshift(newEntry);
      }

      // Limit history size
      const trimmedHistory = history.slice(0, MAX_HISTORY_ENTRIES);

      await AsyncStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch (err) {
      console.error('Failed to save watch progress:', err);
    }
  },

  // Remove a specific entry
  async removeEntry(animeId: string, episodeNumber: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const filtered = history.filter(
        e => !(e.animeId === animeId && e.episodeNumber === episodeNumber)
      );
      await AsyncStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Failed to remove watch history entry:', err);
    }
  },

  // Clear all history
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WATCH_HISTORY_KEY);
    } catch (err) {
      console.error('Failed to clear watch history:', err);
    }
  },

  // Get recently watched (unique anime only)
  async getRecentlyWatched(limit: number = 10): Promise<WatchHistoryEntry[]> {
    try {
      const history = await this.getHistory();
      const seen = new Set<string>();
      const unique: WatchHistoryEntry[] = [];

      for (const entry of history) {
        if (!seen.has(entry.animeId)) {
          seen.add(entry.animeId);
          unique.push(entry);
          if (unique.length >= limit) break;
        }
      }

      return unique;
    } catch (err) {
      console.error('Failed to get recently watched:', err);
      return [];
    }
  },

  // Format timestamp for display (e.g., "12:34")
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // Calculate progress percentage
  getProgressPercent(timestamp: number, duration: number): number {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.round((timestamp / duration) * 100));
  },
};
