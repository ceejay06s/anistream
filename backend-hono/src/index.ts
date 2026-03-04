import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { animeRoutes } from './routes/anime.js';
import { streamingRoutes } from './routes/streaming.js';
import { recaptchaRoutes } from './routes/recaptcha.js';
import { notificationRoutes } from './routes/notifications.js';
import { uploadRoutes } from './routes/upload.js';
import { createWebSocketServer } from './routes/websocket.js';
import { serve } from '@hono/node-server';
import { firestoreDb } from './config/firebase.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin: string) => {
    if (!origin) return undefined;
    const allowed = [
      'http://localhost:8800',
      'http://localhost:5173',
      'http://localhost:8081',
      'http://localhost:19006',
      'https://anistream-pink.vercel.app',
      'https://anistream.expo.app',
      'https://aniwatch-76fd3.web.app',
      'https://anistream-oz3xd4n0i-kuris-projects-e157a786.vercel.app',
    ];
    if (allowed.includes(origin)) return origin;
    // Allow any Expo preview/deploy URL (anistream--*.expo.app)
    if (/^https:\/\/anistream--[a-z0-9]+\.expo\.app$/.test(origin)) return origin;
    return undefined;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Secret-Token'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'AniStream API',
    version: '1.0.0',
    status: 'ok'
  });
});

app.get('/api', (c) => {
  return c.json({ status: 'ok' });
});

// Health: list key routes so deployment can be verified (e.g. /api/news must be present)
app.get('/api/health', (c) =>
  c.json({
    ok: true,
    routes: ['/api', '/api/health', '/api/news', '/api/news/ping', '/api/anime', '/api/streaming'],
  })
);

// GET /api/news (inlined so it always deploys with index)
// Hit /api/news/ping to confirm this deploy is live
app.get('/api/news/ping', (c) => c.json({ ok: true, message: 'news route deployed' }));
app.get('/api/news', async (c) => {
  try {
    if (!firestoreDb) {
      return c.json({ success: true, news: [], message: 'News service unavailable' });
    }
    const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
    const animeId = c.req.query('animeId') || undefined;
    const newsRef = firestoreDb.collection('news');
    const snapshot = animeId
      ? await newsRef.where('animeId', '==', animeId).orderBy('createdAt', 'desc').limit(limit).get()
      : await newsRef.orderBy('createdAt', 'desc').limit(limit).get();
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
    return c.json({ success: false, error: error.message || 'Failed to fetch news', news: [] }, 500);
  }
});

// Routes
app.route('/api/anime', animeRoutes);
app.route('/api/streaming', streamingRoutes);
app.route('/api/recaptcha', recaptchaRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/upload', uploadRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ 
    error: 'Internal Server Error',
    message: err.message 
  }, 500);
});

const port = Number(process.env.PORT) || 8801;

// Start server
const server = serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 Server running on http://localhost:${info.port}`);
});

// Initialize WebSocket server
createWebSocketServer(server);

export default app;
