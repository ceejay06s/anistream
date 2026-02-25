import {
  searchAnimeProvider,
  getAnimeInfoProvider,
  getAnimeEpisodesProvider,
  getHomePageProvider,
  getCategoryAnimeProvider,
  getGenreAnimeProvider,
  getAZAnimeProvider,
} from './aniwatchApiClient.js';

export interface AnimeSearchResult {
  id: string;
  name: string;
  poster: string;
  type?: string;
  rating?: string;
}

export interface VoiceActor {
  character: {
    id: string;
    name: string;
    poster: string;
  };
  voiceActor: {
    id: string;
    name: string;
    poster: string;
  };
}

export interface Studio {
  id: string;
  name: string;
}

export interface RelatedAnime {
  id: string;
  name: string;
  poster: string;
  type?: string;
  episodes?: { sub: number | null; dub: number | null };
}

export interface AnimeInfo {
  id: string;
  name: string;
  description: string;
  poster: string;
  genres: string[];
  episodes: {
    sub: number | null;
    dub: number | null;
  };
  rating?: string;
  type?: string;
  // Extended info
  japanese?: string;
  aired?: string;
  premiered?: string;
  duration?: string;
  status?: string;
  studios?: Studio[];
  producers?: string[];
  characters?: VoiceActor[];
  relatedAnime?: RelatedAnime[];
  recommendedAnime?: RelatedAnime[];
  seasons?: RelatedAnime[];
}

export interface Episode {
  episodeId: string;
  number: number;
  title: string;
}

/**
 * Search for anime with optional filters
 */
export async function searchAnime(
  query: string,
  filters?: {
    type?: string;
    status?: string;
    rated?: string;
    score?: string;
    season?: string;
    language?: string;
    sort?: string;
    genres?: string;
    page?: number;
  }
): Promise<AnimeSearchResult[]> {
  const searchFilters: any = {};
  
  if (filters) {
    if (filters.type && filters.type !== 'all') searchFilters.type = filters.type;
    if (filters.status && filters.status !== 'all') searchFilters.status = filters.status;
    if (filters.rated && filters.rated !== 'all') searchFilters.rated = filters.rated;
    if (filters.score && filters.score !== 'all') searchFilters.score = filters.score;
    if (filters.season && filters.season !== 'all') searchFilters.season = filters.season;
    if (filters.language && filters.language !== 'all') searchFilters.language = filters.language;
    if (filters.sort && filters.sort !== 'default') searchFilters.sort = filters.sort;
    if (filters.genres) {
      // Handle both string and array formats for genres
      if (Array.isArray(filters.genres)) {
        searchFilters.genres = filters.genres.length > 0 ? filters.genres.join(',') : undefined;
      } else {
        searchFilters.genres = filters.genres;
      }
    }
  }

  const page = filters?.page || 1;
  const results = await searchAnimeProvider(query, page, searchFilters);
  
  if (!results?.animes) {
    return [];
  }

  return results.animes.map((anime: any) => ({
    id: anime.id,
    name: anime.name || anime.title,
    poster: anime.poster || '',
    type: anime.type,
    rating: anime.rating,
  }));
}

/**
 * Get anime information
 */
export async function getAnimeInfo(animeId: string): Promise<AnimeInfo | null> {
  const info = await getAnimeInfoProvider(animeId);

  if (!info?.anime) {
    return null;
  }

  // Cast to any for accessing dynamic properties
  const infoAny = info as any;
  const animeAny = info.anime as any;


  const animeInfo = (info.anime.info || info.anime) as any;
  const moreInfo = (info.anime.moreInfo || {}) as any;
  const genres = moreInfo.genres || [];

  // Extract voice actors/characters - check multiple possible locations
  const rawCharacters = animeAny.charactersVoiceActors ||
                        infoAny.charactersVoiceActors ||
                        animeAny.characters ||
                        infoAny.characters ||
                        [];


  const characters: VoiceActor[] = rawCharacters.map((cv: any) => ({
    character: {
      id: cv.character?.id || cv.id || '',
      name: cv.character?.name || cv.name || '',
      poster: cv.character?.poster || cv.poster || cv.image || '',
    },
    voiceActor: {
      id: cv.voiceActor?.id || '',
      name: cv.voiceActor?.name || '',
      poster: cv.voiceActor?.poster || cv.voiceActor?.image || '',
    },
  }));

  // Extract studios - check multiple formats
  const rawStudios = moreInfo.studios || (moreInfo as any).studio || [];
  const studios: Studio[] = (Array.isArray(rawStudios) ? rawStudios : [rawStudios])
    .filter((s: any) => s)
    .map((s: any) => typeof s === 'string' ? { id: s, name: s } : { id: s.id || s, name: s.name || s });

  // Extract related anime - check multiple locations
  const rawRelated = infoAny.relatedAnimes || infoAny.relatedAnime || animeAny.relatedAnimes || [];
  const relatedAnime: RelatedAnime[] = rawRelated.map((ra: any) => ({
    id: ra.id,
    name: ra.name || ra.title || '',
    poster: ra.poster || ra.image || '',
    type: ra.type,
    episodes: ra.episodes,
  }));

  // Extract recommended anime - check multiple locations
  const rawRecommended = infoAny.recommendedAnimes || infoAny.recommendations || animeAny.recommendedAnimes || [];
  const recommendedAnime: RelatedAnime[] = rawRecommended.map((ra: any) => ({
    id: ra.id,
    name: ra.name || ra.title || '',
    poster: ra.poster || ra.image || '',
    type: ra.type,
    episodes: ra.episodes,
  }));

  // Extract seasons if available - check multiple locations
  const rawSeasons = infoAny.seasons || animeAny.seasons || [];
  const seasons: RelatedAnime[] = rawSeasons.map((s: any) => ({
    id: s.id,
    name: s.name || s.title || '',
    poster: s.poster || s.image || '',
    type: s.type,
  }));


  return {
    id: animeId,
    name: animeInfo.name || animeInfo.title || '',
    description: animeInfo.description || '',
    poster: animeInfo.poster || '',
    genres: Array.isArray(genres) ? genres : [genres],
    episodes: animeInfo.stats?.episodes || { sub: null, dub: null },
    rating: animeInfo.rating || moreInfo.malscore,
    type: animeInfo.type,
    // Extended info
    japanese: moreInfo.japanese,
    aired: moreInfo.aired,
    premiered: moreInfo.premiered,
    duration: moreInfo.duration,
    status: moreInfo.status,
    studios,
    producers: moreInfo.producers || [],
    characters,
    relatedAnime,
    recommendedAnime,
    seasons,
  };
}

/**
 * Get anime episodes
 */
export async function getAnimeEpisodes(animeId: string): Promise<Episode[]> {
  const episodes = await getAnimeEpisodesProvider(animeId);
  
  if (!episodes?.episodes) {
    return [];
  }

  return episodes.episodes.map((ep: any) => ({
    episodeId: ep.episodeId || ep.id || '',
    number: ep.number || 0,
    title: ep.title || `Episode ${ep.number || 0}`,
  }));
}

/**
 * Get trending/popular anime from homepage
 */
export async function getTrendingAnime(): Promise<AnimeSearchResult[]> {
  const homepage = await getHomePageProvider();
  
  if (!homepage) {
    return [];
  }

  // Combine different sections from homepage
  const allAnime: any[] = [
    ...(homepage.spotlightAnimes || []),
    ...(homepage.trendingAnimes || []),
    ...(homepage.latestEpisodeAnimes || []),
    ...(homepage.topAiringAnimes || []),
    ...(homepage.mostPopularAnimes || []),
  ];

  // Remove duplicates by ID
  const uniqueAnime = Array.from(
    new Map(allAnime.map((anime) => [anime.id, anime])).values()
  );

  return uniqueAnime.slice(0, 30).map((anime: any) => ({
    id: anime.id,
    name: anime.name || anime.title || '',
    poster: anime.poster || '',
    type: anime.type,
    rating: anime.rating,
  }));
}

/**
 * Get anime by category
 */
export async function getCategoryAnime(
  category: string,
  page: number = 1
): Promise<AnimeSearchResult[]> {
  const results = await getCategoryAnimeProvider(category, page);

  if (!results?.animes) {
    return [];
  }

  return results.animes.map((anime: any) => ({
    id: anime.id,
    name: anime.name || anime.title || '',
    poster: anime.poster || '',
    type: anime.type,
    rating: anime.rating,
  }));
}

/**
 * Get anime by genre
 */
export async function getGenreAnime(
  genre: string,
  page: number = 1
): Promise<AnimeSearchResult[]> {
  const results = await getGenreAnimeProvider(genre, page);

  if (!results?.animes) {
    return [];
  }

  return results.animes.map((anime: any) => ({
    id: anime.id,
    name: anime.name || anime.title || '',
    poster: anime.poster || '',
    type: anime.type,
    rating: anime.rating,
  }));
}

/**
 * Get anime by A-Z letter
 */
export async function getAZAnime(
  letter: string,
  page: number = 1
): Promise<AnimeSearchResult[]> {
  const results = await getAZAnimeProvider(letter, page);

  if (!results?.animes) {
    return [];
  }

  return results.animes.map((anime: any) => ({
    id: anime.id,
    name: anime.name || anime.title || '',
    poster: anime.poster || '',
    type: anime.type,
    rating: anime.rating,
  }));
}

/**
 * Filter anime with multiple parameters
 */
export async function filterAnime(
  filters: {
    q?: string;
    type?: string;
    status?: string;
    rated?: string;
    score?: string;
    season?: string;
    language?: string;
    sort?: string;
    genres?: string;
    page?: number;
  }
): Promise<AnimeSearchResult[]> {
  // Use search with filters - if no query, use empty string or a common term
  const query = filters.q || '';
  const page = filters.page || 1;

  const searchFilters: any = {};
  if (filters.type && filters.type !== 'all') searchFilters.type = filters.type;
  if (filters.status && filters.status !== 'all') searchFilters.status = filters.status;
  if (filters.rated && filters.rated !== 'all') searchFilters.rated = filters.rated;
  if (filters.score && filters.score !== 'all') searchFilters.score = filters.score;
  if (filters.season && filters.season !== 'all') searchFilters.season = filters.season;
  if (filters.language && filters.language !== 'all') searchFilters.language = filters.language;
  if (filters.sort && filters.sort !== 'default') searchFilters.sort = filters.sort;
  if (filters.genres) searchFilters.genres = filters.genres;

  // Use search with filters - for filter-only (no query), use 'a' as minimal search term
  // The aniwatch API requires a search term, so we use a common letter that returns results
  const searchQuery = query || 'a';
  const results = await searchAnimeProvider(searchQuery, page, searchFilters);

  if (!results?.animes) {
    return [];
  }

  return results.animes.map((anime: any) => ({
    id: anime.id,
    name: anime.name || anime.title || '',
    poster: anime.poster || '',
    type: anime.type,
    rating: anime.rating,
  }));
}
