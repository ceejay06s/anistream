import { Hono } from 'hono';
import { firestoreDb } from '../config/firebase.js';

export const newsRoutes = new Hono();

/**
 * GET /api/news
 * Returns latest news from Firestore (populated by anime update service).
 * Query: limit (default 20), animeId (optional - filter by anime)
 */
newsRoutes.get('/', async (c) => {
  try {
    if (!firestoreDb) {
      return c.json({ news: [], message: 'News service unavailable' });
    }

    const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
    const animeId = c.req.query('animeId') || undefined;

    const newsRef = firestoreDb.collection('news');

    const snapshot = animeId
      ? await newsRef
          .where('animeId', '==', animeId)
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get()
      : await newsRef
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();

    const news = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      const createdAt = typeof data.createdAt?.toMillis === 'function'
        ? data.createdAt.toMillis()
        : (data.createdAt ?? Date.now());
      return { id: doc.id, ...data, createdAt };
    });

    return c.json({ success: true, news });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to fetch news', news: [] },
      500
    );
  }
});
