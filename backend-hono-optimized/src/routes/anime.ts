import { Context, Hono } from 'hono';
import {
  filterAnime,
  getAnimeEpisodes,
  getAnimeInfo,
  getAZAnime,
  getCategoryAnime,
  getGenreAnime,
  getTrendingAnime,
  searchAnime,
  type AnimeFilters,
} from '../services/animeService.js';

export const animeRoutes = new Hono();

function parsePage(rawPage: string | undefined): number {
  const page = Number(rawPage);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function buildFilters(c: Context): AnimeFilters {
  return {
    q: c.req.query('q'),
    type: c.req.query('type'),
    status: c.req.query('status'),
    rated: c.req.query('rated'),
    score: c.req.query('score'),
    season: c.req.query('season'),
    language: c.req.query('language'),
    sort: c.req.query('sort'),
    genres: c.req.query('genres'),
    page: parsePage(c.req.query('page')),
  };
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

async function handle(c: Context, runner: () => Promise<unknown>) {
  try {
    const data = await runner();
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: asErrorMessage(error) }, 500);
  }
}

animeRoutes.get('/trending', (c) => handle(c, () => getTrendingAnime()));

animeRoutes.get('/search', async (c) => {
  const query = c.req.query('q');
  if (!query) {
    return c.json({ error: 'Query parameter "q" is required' }, 400);
  }

  const filters = buildFilters(c);
  return handle(c, () => searchAnime(query, filters));
});

animeRoutes.get('/info/:animeId', async (c) => {
  const animeId = c.req.param('animeId');

  try {
    const info = await getAnimeInfo(animeId);
    if (!info) {
      return c.json({ success: false, error: 'Anime not found' }, 404);
    }
    return c.json({ success: true, data: info });
  } catch (error) {
    return c.json({ success: false, error: asErrorMessage(error) }, 500);
  }
});

animeRoutes.get('/episodes/:animeId', (c) => {
  const animeId = c.req.param('animeId');
  return handle(c, () => getAnimeEpisodes(animeId));
});

animeRoutes.get('/category/:category', (c) => {
  const category = c.req.param('category');
  const page = parsePage(c.req.query('page'));
  return handle(c, () => getCategoryAnime(category, page));
});

animeRoutes.get('/genre/:genre', (c) => {
  const genre = c.req.param('genre');
  const page = parsePage(c.req.query('page'));
  return handle(c, () => getGenreAnime(genre, page));
});

animeRoutes.get('/az/:letter', (c) => {
  const letter = c.req.param('letter');
  const page = parsePage(c.req.query('page'));
  return handle(c, () => getAZAnime(letter, page));
});

animeRoutes.get('/filter', (c) => {
  const filters = buildFilters(c);
  return handle(c, () => filterAnime(filters));
});
