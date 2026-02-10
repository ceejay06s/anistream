/**
 * Metadata API Service
 * 
 * Fetches anime metadata from Jikan (MyAnimeList) and AniList APIs
 * This is for anime information only, not streaming
 */

import { Anime } from '../types';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
const ANILIST_API_URL = 'https://graphql.anilist.co';

/**
 * Fetch anime by ID from Jikan API
 */
export const fetchAnimeById = async (id: string): Promise<Anime | null> => {
  try {
    // Jikan uses MAL IDs, try parsing if it's a number
    const malId = parseInt(id);
    if (isNaN(malId)) {
      // If not a number, try searching first
      return await searchAnimeById(id);
    }

    const response = await fetch(`${JIKAN_BASE_URL}/anime/${malId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const animeData = data.data;

    return {
      id: String(animeData.mal_id),
      title: animeData.title || animeData.title_english || '',
      coverImage: animeData.images?.jpg?.image_url || '',
      bannerImage: animeData.images?.jpg?.large_image_url || '',
      description: animeData.synopsis || '',
      episodes: animeData.episodes || 0,
      rating: animeData.score || 0,
      year: animeData.year || 0,
      genres: animeData.genres?.map((g: any) => g.name) || [],
      status: animeData.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: animeData.duration || '24 min',
      studio: animeData.studios?.[0]?.name || '',
    };
  } catch (error: any) {
    console.error('Error fetching anime by ID:', error);
    return null;
  }
};

/**
 * Search for anime and return first result
 */
const searchAnimeById = async (query: string): Promise<Anime | null> => {
  try {
    const response = await fetch(`${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=1`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const animeData = data.data[0];
      return {
        id: String(animeData.mal_id),
        title: animeData.title || animeData.title_english || '',
        coverImage: animeData.images?.jpg?.image_url || '',
        bannerImage: animeData.images?.jpg?.large_image_url || '',
        description: animeData.synopsis || '',
        episodes: animeData.episodes || 0,
        rating: animeData.score || 0,
        year: animeData.year || 0,
        genres: animeData.genres?.map((g: any) => g.name) || [],
        status: animeData.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
        duration: animeData.duration || '24 min',
        studio: animeData.studios?.[0]?.name || '',
      };
    }
    return null;
  } catch (error: any) {
    console.error('Error searching anime:', error);
    return null;
  }
};

/**
 * Search anime
 */
export const searchAnime = async (query: string): Promise<Anime[]> => {
  try {
    const response = await fetch(`${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=20`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((animeData: any) => ({
      id: String(animeData.mal_id),
      title: animeData.title || animeData.title_english || '',
      coverImage: animeData.images?.jpg?.image_url || '',
      bannerImage: animeData.images?.jpg?.large_image_url || '',
      description: animeData.synopsis || '',
      episodes: animeData.episodes || 0,
      rating: animeData.score || 0,
      year: animeData.year || 0,
      genres: animeData.genres?.map((g: any) => g.name) || [],
      status: animeData.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: animeData.duration || '24 min',
      studio: animeData.studios?.[0]?.name || '',
    }));
  } catch (error: any) {
    console.error('Error searching anime:', error);
    return [];
  }
};

/**
 * Fetch top anime
 */
export const fetchTopAnime = async (page: number = 1, limit: number = 25): Promise<Anime[]> => {
  try {
    const response = await fetch(`${JIKAN_BASE_URL}/top/anime?page=${page}&limit=${limit}`, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((animeData: any) => ({
      id: String(animeData.mal_id),
      title: animeData.title || animeData.title_english || '',
      coverImage: animeData.images?.jpg?.image_url || '',
      bannerImage: animeData.images?.jpg?.large_image_url || '',
      description: animeData.synopsis || '',
      episodes: animeData.episodes || 0,
      rating: animeData.score || 0,
      year: animeData.year || 0,
      genres: animeData.genres?.map((g: any) => g.name) || [],
      status: animeData.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: animeData.duration || '24 min',
      studio: animeData.studios?.[0]?.name || '',
    }));
  } catch (error: any) {
    // Only log in development, and make it less verbose
    // These errors are non-critical - the app will work without metadata
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('⚠️ Failed to fetch top anime (this is non-critical):', error.message);
    }
    return [];
  }
};

/**
 * Fetch trending anime (from AniList)
 */
export const fetchTrendingAnime = async (): Promise<Anime[]> => {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(type: ANIME, sort: TRENDING_DESC) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          bannerImage
          description
          episodes
          averageScore
          startDate {
            year
          }
          genres
          status
          duration
          studios(isMain: true) {
            nodes {
              name
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return (data.data?.Page?.media || []).map((animeData: any) => ({
      id: String(animeData.id),
      title: animeData.title.english || animeData.title.romaji || '',
      coverImage: animeData.coverImage?.large || '',
      bannerImage: animeData.bannerImage || '',
      description: animeData.description || '',
      episodes: animeData.episodes || 0,
      rating: (animeData.averageScore || 0) / 10, // Convert from 100 to 10 scale
      year: animeData.startDate?.year || 0,
      genres: animeData.genres || [],
      status: animeData.status === 'FINISHED' ? 'Completed' : 'Ongoing',
      duration: animeData.duration ? `${animeData.duration} min` : '24 min',
      studio: animeData.studios?.nodes?.[0]?.name || '',
    }));
  } catch (error: any) {
    // Only log in development, and make it less verbose
    // These errors are non-critical - the app will work without metadata
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('⚠️ Failed to fetch trending anime (this is non-critical):', error.message);
    }
    return [];
  }
};

/**
 * Fetch seasonal anime
 */
export const fetchSeasonalAnime = async (): Promise<Anime[]> => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const season = ['winter', 'spring', 'summer', 'fall'][Math.floor(now.getMonth() / 3)];
    
    const response = await fetch(`${JIKAN_BASE_URL}/seasons/${year}/${season}`, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).slice(0, 20).map((animeData: any) => ({
      id: String(animeData.mal_id),
      title: animeData.title || animeData.title_english || '',
      coverImage: animeData.images?.jpg?.image_url || '',
      bannerImage: animeData.images?.jpg?.large_image_url || '',
      description: animeData.synopsis || '',
      episodes: animeData.episodes || 0,
      rating: animeData.score || 0,
      year: animeData.year || 0,
      genres: animeData.genres?.map((g: any) => g.name) || [],
      status: animeData.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: animeData.duration || '24 min',
      studio: animeData.studios?.[0]?.name || '',
    }));
  } catch (error: any) {
    // Only log in development, and make it less verbose
    // These errors are non-critical - the app will work without metadata
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('⚠️ Failed to fetch seasonal anime (this is non-critical):', error.message);
    }
    return [];
  }
};

/**
 * Fetch latest anime
 */
export const fetchLatestAnime = async (): Promise<Anime[]> => {
  return fetchTopAnime(1, 25); // Use top anime as latest
};

/**
 * Fetch anime by genre
 */
export const fetchAnimeByGenre = async (genreId: number, page: number = 1): Promise<Anime[]> => {
  try {
    const response = await fetch(`${JIKAN_BASE_URL}/anime?genres=${genreId}&page=${page}&limit=25`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((animeData: any) => ({
      id: String(animeData.mal_id),
      title: animeData.title || animeData.title_english || '',
      coverImage: animeData.images?.jpg?.image_url || '',
      bannerImage: animeData.images?.jpg?.large_image_url || '',
      description: animeData.synopsis || '',
      episodes: animeData.episodes || 0,
      rating: animeData.score || 0,
      year: animeData.year || 0,
      genres: animeData.genres?.map((g: any) => g.name) || [],
      status: animeData.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: animeData.duration || '24 min',
      studio: animeData.studios?.[0]?.name || '',
    }));
  } catch (error: any) {
    console.error('Error fetching anime by genre:', error);
    return [];
  }
};

/**
 * Fetch genres
 */
export interface Genre {
  mal_id: number;
  name: string;
  count?: number;
}

export const fetchGenres = async (): Promise<Genre[]> => {
  try {
    const response = await fetch(`${JIKAN_BASE_URL}/genres/anime`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((genre: any) => ({
      mal_id: genre.mal_id,
      name: genre.name,
      count: genre.count,
    }));
  } catch (error: any) {
    console.error('Error fetching genres:', error);
    return [];
  }
};

/**
 * Get popular genres (hardcoded fallback)
 */
export const getPopularGenres = (): Array<{ id: number; name: string }> => {
  return [
    { id: 1, name: 'Action' },
    { id: 2, name: 'Adventure' },
    { id: 4, name: 'Comedy' },
    { id: 7, name: 'Mystery' },
    { id: 10, name: 'Fantasy' },
    { id: 22, name: 'Romance' },
    { id: 23, name: 'School' },
    { id: 27, name: 'Shounen' },
    { id: 37, name: 'Supernatural' },
  ];
};
