import { Hono } from 'hono';
import { searchAnime, getAnimeInfo, getAnimeEpisodes, getTrendingAnime, getCategoryAnime, getGenreAnime, getAZAnime, filterAnime } from '../services/animeService.js';

export const animeRoutes = new Hono();

// Get trending/popular anime
animeRoutes.get('/trending', async (c) => {
  try {
    const results = await getTrendingAnime();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Search anime with filters
animeRoutes.get('/search', async (c) => {
  const query = c.req.query('q');
  if (!query) {
    return c.json({ error: 'Query parameter "q" is required' }, 400);
  }

  const filters = {
    type: c.req.query('type'),
    status: c.req.query('status'),
    rated: c.req.query('rated'),
    score: c.req.query('score'),
    season: c.req.query('season'),
    language: c.req.query('language'),
    sort: c.req.query('sort'),
    genres: c.req.query('genres'),
    page: c.req.query('page') ? parseInt(c.req.query('page')!) : 1,
  };

  try {
    const results = await searchAnime(query, filters);
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Get anime info
animeRoutes.get('/info/:animeId', async (c) => {
  const animeId = c.req.param('animeId');
  
  try {
    const info = await getAnimeInfo(animeId);
    if (!info) {
      return c.json({ 
        success: false, 
        error: 'Anime not found' 
      }, 404);
    }
    return c.json({ success: true, data: info });
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Get anime episodes
animeRoutes.get('/episodes/:animeId', async (c) => {
  const animeId = c.req.param('animeId');
  
  try {
    const episodes = await getAnimeEpisodes(animeId);
    return c.json({ success: true, data: episodes });
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Get anime by category
animeRoutes.get('/category/:category', async (c) => {
  const category = c.req.param('category');
  const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1;

  try {
    const results = await getCategoryAnime(category, page);
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Get anime by genre
animeRoutes.get('/genre/:genre', async (c) => {
  const genre = c.req.param('genre');
  const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1;

  try {
    const results = await getGenreAnime(genre, page);
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Get anime by A-Z letter
animeRoutes.get('/az/:letter', async (c) => {
  const letter = c.req.param('letter');
  const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1;

  try {
    const results = await getAZAnime(letter, page);
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Filter anime with multiple parameters
animeRoutes.get('/filter', async (c) => {
  const filters = {
    q: c.req.query('q'),
    type: c.req.query('type'),
    status: c.req.query('status'),
    rated: c.req.query('rated'),
    score: c.req.query('score'),
    season: c.req.query('season'),
    language: c.req.query('language'),
    sort: c.req.query('sort'),
    genres: c.req.query('genres'),
    page: c.req.query('page') ? parseInt(c.req.query('page')!) : 1,
  };

  try {
    const results = await filterAnime(filters);
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
