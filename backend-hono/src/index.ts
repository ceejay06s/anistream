import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { animeRoutes } from './routes/anime';
import { streamingRoutes } from './routes/streaming';
import { createWebSocketServer } from './routes/websocket';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:8800',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:19006',
    'https://anistream-pink.vercel.app',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
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

// Routes
app.route('/api/anime', animeRoutes);
app.route('/api/streaming', streamingRoutes);

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
import { serve } from '@hono/node-server';

const server = serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 Server running on http://localhost:${info.port}`);
});

// Initialize WebSocket server
createWebSocketServer(server);

export default app;
