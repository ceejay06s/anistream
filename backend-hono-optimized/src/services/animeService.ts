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

export interface AnimeFilters {
  q?: string;
  type?: string;
  status?: string;
  rated?: string;
  score?: string;
  season?: string;
  language?: string;
  sort?: string;
  genres?: string | string[];
  page?: number;
}

function mapAnimeCard(anime: any): AnimeSearchResult {
  return {
    id: anime?.id || '',
    name: anime?.name || anime?.title || '',
    poster: anime?.poster || '',
    type: anime?.type,
    rating: anime?.rating,
  };
}

function mapAnimeList(payload: any): AnimeSearchResult[] {
  if (!payload?.animes || !Array.isArray(payload.animes)) {
    return [];
  }
  return payload.animes.map(mapAnimeCard);
}

function getPrimaryVoiceActor(cv: any): any {
  if (!cv || typeof cv !== 'object') {
    return null;
  }

  if (cv.voiceActor) {
    return cv.voiceActor;
  }

  if (Array.isArray(cv.voiceActors) && cv.voiceActors.length > 0) {
    return cv.voiceActors[0];
  }

  if (Array.isArray(cv.character?.voiceActors) && cv.character.voiceActors.length > 0) {
    return cv.character.voiceActors[0];
  }

  return null;
}

function toStudios(rawStudios: any): Studio[] {
  const list = Array.isArray(rawStudios) ? rawStudios : rawStudios ? [rawStudios] : [];
  return list
    .filter(Boolean)
    .map((studio: any) =>
      typeof studio === 'string'
        ? { id: studio, name: studio }
        : { id: studio.id || studio.name || '', name: studio.name || studio.id || '' }
    );
}

function toRelatedAnime(rawList: any): RelatedAnime[] {
  if (!Array.isArray(rawList)) {
    return [];
  }

  return rawList.map((anime: any) => ({
    id: anime?.id || '',
    name: anime?.name || anime?.title || '',
    poster: anime?.poster || anime?.image || '',
    type: anime?.type,
    episodes: anime?.episodes,
  }));
}

function toCharacters(rawCharacters: any): VoiceActor[] {
  if (!Array.isArray(rawCharacters)) {
    return [];
  }

  return rawCharacters
    .map((cv: any) => {
      const voiceActor = getPrimaryVoiceActor(cv);
      return {
        character: {
          id: cv?.character?.id || cv?.id || '',
          name: cv?.character?.name || cv?.name || '',
          poster: cv?.character?.poster || cv?.poster || cv?.image || '',
        },
        voiceActor: {
          id: voiceActor?.id || '',
          name: voiceActor?.name || '',
          poster: voiceActor?.poster || voiceActor?.image || '',
        },
      };
    })
    .filter((cv: VoiceActor) => Boolean(cv.character.name || cv.voiceActor.name));
}

function normalizeGenres(rawGenres: any): string[] {
  if (Array.isArray(rawGenres)) {
    return rawGenres.filter(Boolean).map((genre) => String(genre));
  }
  if (!rawGenres) {
    return [];
  }
  return [String(rawGenres)];
}

function buildSearchFilters(filters?: AnimeFilters): Record<string, string> {
  if (!filters) {
    return {};
  }

  const result: Record<string, string> = {};
  const validKeys: Array<keyof AnimeFilters> = [
    'type',
    'status',
    'rated',
    'score',
    'season',
    'language',
    'sort',
  ];

  validKeys.forEach((key) => {
    const value = filters[key];
    if (!value) {
      return;
    }

    const normalized = String(value).trim();
    if (!normalized || normalized === 'all' || normalized === 'default') {
      return;
    }
    result[key] = normalized;
  });

  if (filters.genres) {
    const value = Array.isArray(filters.genres) ? filters.genres.join(',') : String(filters.genres);
    if (value.trim()) {
      result.genres = value;
    }
  }

  return result;
}

export async function searchAnime(query: string, filters?: AnimeFilters): Promise<AnimeSearchResult[]> {
  const page = Number(filters?.page || 1);
  const results = await searchAnimeProvider(query, page, buildSearchFilters(filters));
  return mapAnimeList(results);
}

export async function getAnimeInfo(animeId: string): Promise<AnimeInfo | null> {
  const info = await getAnimeInfoProvider(animeId);
  if (!info?.anime) {
    return null;
  }

  const infoAny = info as any;
  const animeRoot = infoAny.anime || {};
  const animeInfo = (animeRoot.info || animeRoot) as any;
  const moreInfo = (animeRoot.moreInfo || {}) as any;

  const rawCharacters =
    animeRoot.charactersVoiceActors ||
    infoAny.charactersVoiceActors ||
    animeRoot.characters ||
    infoAny.characters ||
    [];

  const relatedAnime = toRelatedAnime(
    infoAny.relatedAnimes || infoAny.relatedAnime || animeRoot.relatedAnimes || []
  );
  const recommendedAnime = toRelatedAnime(
    infoAny.recommendedAnimes || infoAny.recommendations || animeRoot.recommendedAnimes || []
  );
  const seasons = toRelatedAnime(infoAny.seasons || animeRoot.seasons || []);

  return {
    id: animeId,
    name: animeInfo.name || animeInfo.title || '',
    description: animeInfo.description || '',
    poster: animeInfo.poster || '',
    genres: normalizeGenres(moreInfo.genres),
    episodes: animeInfo.stats?.episodes || { sub: null, dub: null },
    rating: animeInfo.rating || moreInfo.malscore,
    type: animeInfo.type,
    japanese: moreInfo.japanese,
    aired: moreInfo.aired,
    premiered: moreInfo.premiered,
    duration: moreInfo.duration,
    status: moreInfo.status,
    studios: toStudios(moreInfo.studios || moreInfo.studio),
    producers: Array.isArray(moreInfo.producers) ? moreInfo.producers : [],
    characters: toCharacters(rawCharacters),
    relatedAnime,
    recommendedAnime,
    seasons,
  };
}

export async function getAnimeEpisodes(animeId: string): Promise<Episode[]> {
  const episodes = await getAnimeEpisodesProvider(animeId);
  if (!episodes?.episodes || !Array.isArray(episodes.episodes)) {
    return [];
  }

  return episodes.episodes.map((ep: any) => ({
    episodeId: ep.episodeId || ep.id || '',
    number: Number(ep.number || 0),
    title: ep.title || `Episode ${ep.number || 0}`,
  }));
}

export async function getTrendingAnime(): Promise<AnimeSearchResult[]> {
  const homepage = await getHomePageProvider();
  if (!homepage) {
    return [];
  }

  const sections: any[][] = [
    homepage.spotlightAnimes || [],
    homepage.trendingAnimes || [],
    homepage.latestEpisodeAnimes || [],
    homepage.topAiringAnimes || [],
    homepage.mostPopularAnimes || [],
  ];

  const unique = new Map<string, any>();
  sections.flat().forEach((anime) => {
    if (anime?.id && !unique.has(anime.id)) {
      unique.set(anime.id, anime);
    }
  });

  return [...unique.values()].slice(0, 30).map(mapAnimeCard);
}

export async function getCategoryAnime(category: string, page: number = 1): Promise<AnimeSearchResult[]> {
  const results = await getCategoryAnimeProvider(category, page);
  return mapAnimeList(results);
}

export async function getGenreAnime(genre: string, page: number = 1): Promise<AnimeSearchResult[]> {
  const results = await getGenreAnimeProvider(genre, page);
  return mapAnimeList(results);
}

export async function getAZAnime(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
  const results = await getAZAnimeProvider(letter, page);
  return mapAnimeList(results);
}

export async function filterAnime(filters: AnimeFilters): Promise<AnimeSearchResult[]> {
  const query = (filters.q || '').trim() || 'a';
  const page = Number(filters.page || 1);
  const results = await searchAnimeProvider(query, page, buildSearchFilters(filters));
  return mapAnimeList(results);
}
