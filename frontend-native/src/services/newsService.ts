import { Platform } from 'react-native';
import { app } from '@/config/firebase';

// Lazy initialization to avoid module load order issues
function getDb() {
  if (!app) {
    return null;
  }
  const { getFirestore } = require('firebase/firestore');
  return getFirestore(app);
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  imageUrl?: string;
  animeId?: string;
  animeName?: string;
  type: 'new_episode' | 'new_season' | 'announcement' | 'news';
  createdAt: number;
  url?: string;
}

export const newsService = {
  async getNews(limit: number = 20): Promise<NewsItem[]> {
    const db = getDb();
    if (!db) {
      // Return mock data for now
      return this.getMockNews();
    }

    try {
      const { collection, query, orderBy, limit: limitQuery, getDocs } = require('firebase/firestore');
      const q = query(
        collection(db, 'news'),
        orderBy('createdAt', 'desc'),
        limitQuery(limit)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return this.getMockNews();
      }

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error('Failed to fetch news:', err);
      return this.getMockNews();
    }
  },

  async getNewsForAnime(animeId: string): Promise<NewsItem[]> {
    const db = getDb();
    if (!db) {
      return [];
    }

    try {
      const { collection, query, where, orderBy, getDocs } = require('firebase/firestore');
      const q = query(
        collection(db, 'news'),
        where('animeId', '==', animeId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error('Failed to fetch news for anime:', err);
      return [];
    }
  },

  getMockNews(): NewsItem[] {
    const now = Date.now();
    return [
      {
        id: '1',
        title: 'Solo Leveling Season 2 Announced',
        summary: 'A-1 Pictures confirms second season of the hit anime adaptation.',
        type: 'new_season',
        animeName: 'Solo Leveling',
        createdAt: now - 1000 * 60 * 60 * 2, // 2 hours ago
      },
      {
        id: '2',
        title: 'One Piece Episode 1100 Coming Soon',
        summary: 'The Egghead Island arc continues with new episodes this week.',
        type: 'new_episode',
        animeName: 'One Piece',
        createdAt: now - 1000 * 60 * 60 * 5, // 5 hours ago
      },
      {
        id: '3',
        title: 'Demon Slayer: Infinity Castle Arc Movie Announcement',
        summary: 'The final arc will be adapted as a theatrical movie trilogy.',
        type: 'announcement',
        animeName: 'Demon Slayer',
        createdAt: now - 1000 * 60 * 60 * 12, // 12 hours ago
      },
      {
        id: '4',
        title: 'Winter 2026 Anime Season Preview',
        summary: 'Check out the most anticipated anime series coming this January.',
        type: 'news',
        createdAt: now - 1000 * 60 * 60 * 24, // 1 day ago
      },
      {
        id: '5',
        title: 'Jujutsu Kaisen Manga Final Arc',
        summary: 'The manga approaches its climactic conclusion.',
        type: 'announcement',
        animeName: 'Jujutsu Kaisen',
        createdAt: now - 1000 * 60 * 60 * 48, // 2 days ago
      },
    ];
  },

  formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  },
};
