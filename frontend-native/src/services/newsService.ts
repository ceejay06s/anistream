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

function parseNewsResponse(res: Response, data: unknown): NewsItem[] | null {
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  const d = data as { success?: boolean; news?: NewsItem[] };
  if (d && d.success === true && Array.isArray(d.news)) return d.news;
  return null;
}

export const newsService = {
  async getNews(limit: number = 20): Promise<NewsItem[]> {
    try {
      const api = require('./api');
      const base = api.API_BASE_URL;
      const url = `${base}/api/news?limit=${limit}`;
      let res = await fetch(url);
      let data = await res.json().catch(() => ({}));
      let news = parseNewsResponse(res, data);
      if (news) return news;
      // If primary returned 404, try backup API (e.g. Railway) when available
      const backupUrls = typeof api.getBackupApiUrls === 'function' ? api.getBackupApiUrls() : [];
      for (const backupBase of backupUrls) {
        if (backupBase === base) continue;
        try {
          res = await fetch(`${backupBase}/api/news?limit=${limit}`);
          data = await res.json().catch(() => ({}));
          news = parseNewsResponse(res, data);
          if (news) return news;
        } catch {
          // skip
        }
      }
      return this.getMockNews();
    } catch (err) {
      console.error('Failed to fetch news:', err);
      return this.getMockNews();
    }
  },

  async getNewsForAnime(animeId: string, limit: number = 20): Promise<NewsItem[]> {
    try {
      const api = require('./api');
      const base = api.API_BASE_URL;
      const q = `animeId=${encodeURIComponent(animeId)}&limit=${limit}`;
      let res = await fetch(`${base}/api/news?${q}`);
      let data = await res.json().catch(() => ({}));
      let news = parseNewsResponse(res, data);
      if (news) return news;
      const backupUrls = typeof api.getBackupApiUrls === 'function' ? api.getBackupApiUrls() : [];
      for (const backupBase of backupUrls) {
        if (backupBase === base) continue;
        try {
          res = await fetch(`${backupBase}/api/news?${q}`);
          data = await res.json().catch(() => ({}));
          news = parseNewsResponse(res, data);
          if (news) return news;
        } catch {
          // skip
        }
      }
      return [];
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
