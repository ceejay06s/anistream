import { Anime } from '../types';

// Jikan API (MyAnimeList unofficial API) - No auth required
const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// AniList GraphQL API endpoint
const ANILIST_URL = 'https://graphql.anilist.co';

// Sleep function to respect rate limits
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch top anime from MyAnimeList via Jikan API
 */
export const fetchTopAnime = async (page: number = 1, limit: number = 25): Promise<Anime[]> => {
  try {
    const response = await fetch(
      `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=${limit}`
    );
    const data = await response.json();
    
    return data.data.map((anime: any) => ({
      id: anime.mal_id.toString(),
      title: anime.title,
      coverImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      bannerImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      description: anime.synopsis || 'No description available.',
      episodes: anime.episodes || 0,
      rating: anime.score || 0,
      year: anime.year || new Date().getFullYear(),
      genres: anime.genres.map((g: any) => g.name),
      status: anime.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: anime.duration || '24 min',
      studio: anime.studios?.[0]?.name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching top anime:', error);
    return [];
  }
};

/**
 * Search anime by query
 */
export const searchAnime = async (query: string): Promise<Anime[]> => {
  try {
    const response = await fetch(
      `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=20`
    );
    const data = await response.json();
    
    return data.data.map((anime: any) => ({
      id: anime.mal_id.toString(),
      title: anime.title,
      coverImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      bannerImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      description: anime.synopsis || 'No description available.',
      episodes: anime.episodes || 0,
      rating: anime.score || 0,
      year: anime.year || new Date().getFullYear(),
      genres: anime.genres.map((g: any) => g.name),
      status: anime.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: anime.duration || '24 min',
      studio: anime.studios?.[0]?.name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error searching anime:', error);
    return [];
  }
};

/**
 * Fetch anime by genre
 */
export const fetchAnimeByGenre = async (genreId: number, page: number = 1): Promise<Anime[]> => {
  try {
    const response = await fetch(
      `${JIKAN_BASE_URL}/anime?genres=${genreId}&page=${page}&limit=20`
    );
    const data = await response.json();
    
    return data.data.map((anime: any) => ({
      id: anime.mal_id.toString(),
      title: anime.title,
      coverImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      bannerImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      description: anime.synopsis || 'No description available.',
      episodes: anime.episodes || 0,
      rating: anime.score || 0,
      year: anime.year || new Date().getFullYear(),
      genres: anime.genres.map((g: any) => g.name),
      status: anime.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: anime.duration || '24 min',
      studio: anime.studios?.[0]?.name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching anime by genre:', error);
    return [];
  }
};

/**
 * Fetch anime details by ID
 */
export const fetchAnimeById = async (id: string): Promise<Anime | null> => {
  try {
    const response = await fetch(`${JIKAN_BASE_URL}/anime/${id}/full`);
    const data = await response.json();
    const anime = data.data;
    
    return {
      id: anime.mal_id.toString(),
      title: anime.title,
      coverImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      bannerImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      description: anime.synopsis || 'No description available.',
      episodes: anime.episodes || 0,
      rating: anime.score || 0,
      year: anime.year || new Date().getFullYear(),
      genres: anime.genres.map((g: any) => g.name),
      status: anime.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: anime.duration || '24 min',
      studio: anime.studios?.[0]?.name || 'Unknown',
    };
  } catch (error) {
    console.error('Error fetching anime by ID:', error);
    return null;
  }
};

/**
 * Fetch seasonal anime (current season)
 */
export const fetchSeasonalAnime = async (): Promise<Anime[]> => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Determine season
    let season = 'winter';
    if (month >= 3 && month <= 5) season = 'spring';
    else if (month >= 6 && month <= 8) season = 'summer';
    else if (month >= 9 && month <= 11) season = 'fall';
    
    const response = await fetch(
      `${JIKAN_BASE_URL}/seasons/${year}/${season}`
    );
    const data = await response.json();
    
    return data.data.slice(0, 20).map((anime: any) => ({
      id: anime.mal_id.toString(),
      title: anime.title,
      coverImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      bannerImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      description: anime.synopsis || 'No description available.',
      episodes: anime.episodes || 0,
      rating: anime.score || 0,
      year: anime.year || year,
      genres: anime.genres.map((g: any) => g.name),
      status: anime.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: anime.duration || '24 min',
      studio: anime.studios?.[0]?.name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching seasonal anime:', error);
    return [];
  }
};

/**
 * Fetch recently added/latest anime
 */
export const fetchLatestAnime = async (): Promise<Anime[]> => {
  try {
    // Get current season's newest anime, sorted by start date
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Determine season
    let season = 'winter';
    if (month >= 3 && month <= 5) season = 'spring';
    else if (month >= 6 && month <= 8) season = 'summer';
    else if (month >= 9 && month <= 11) season = 'fall';
    
    const response = await fetch(
      `${JIKAN_BASE_URL}/seasons/${year}/${season}?filter=tv&order_by=start_date&sort=desc&limit=15`
    );
    const data = await response.json();
    
    return data.data.map((anime: any) => ({
      id: anime.mal_id.toString(),
      title: anime.title,
      coverImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      bannerImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      description: anime.synopsis || 'No description available.',
      episodes: anime.episodes || 0,
      rating: anime.score || 0,
      year: anime.year || year,
      genres: anime.genres.map((g: any) => g.name),
      status: anime.status === 'Finished Airing' ? 'Completed' : 'Ongoing',
      duration: anime.duration || '24 min',
      studio: anime.studios?.[0]?.name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching latest anime:', error);
    return [];
  }
};

/**
 * Fetch trending/popular anime using AniList API
 */
export const fetchTrendingAnime = async (): Promise<Anime[]> => {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(sort: TRENDING_DESC, type: ANIME) {
          id
          title {
            english
            romaji
          }
          coverImage {
            large
            extraLarge
          }
          bannerImage
          description
          episodes
          averageScore
          seasonYear
          genres
          status
          duration
          studios {
            nodes {
              name
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    const data = await response.json();
    
    return data.data.Page.media.map((anime: any) => ({
      id: anime.id.toString(),
      title: anime.title.english || anime.title.romaji,
      coverImage: anime.coverImage.extraLarge || anime.coverImage.large,
      bannerImage: anime.bannerImage || anime.coverImage.extraLarge,
      description: anime.description?.replace(/<[^>]*>/g, '') || 'No description available.',
      episodes: anime.episodes || 0,
      rating: anime.averageScore ? anime.averageScore / 10 : 0,
      year: anime.seasonYear || new Date().getFullYear(),
      genres: anime.genres || [],
      status: anime.status === 'FINISHED' ? 'Completed' : 'Ongoing',
      duration: anime.duration ? `${anime.duration} min` : '24 min',
      studio: anime.studios.nodes?.[0]?.name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching trending anime from AniList:', error);
    return [];
  }
};

// Genre mapping for Jikan API
export const GENRE_MAP = {
  'All': 0,
  'Action': 1,
  'Adventure': 2,
  'Comedy': 4,
  'Drama': 8,
  'Fantasy': 10,
  'Horror': 14,
  'Mystery': 7,
  'Supernatural': 37,
  'Romance': 22,
  'Sci-Fi': 24,
  'Slice of Life': 36,
  'Sports': 30,
  'Thriller': 41,
};

export interface Genre {
  mal_id: number;
  name: string;
  count: number;
}

/**
 * Fetch all available anime genres from Jikan API
 */
export const fetchGenres = async (): Promise<Genre[]> => {
  try {
    const response = await fetch(`${JIKAN_BASE_URL}/genres/anime`);
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
};

/**
 * Get popular/featured genres for search categories
 */
export const getPopularGenres = (): { id: number; name: string; icon: string }[] => {
  return [
    { id: 1, name: 'Action', icon: 'flash-on' },
    { id: 2, name: 'Adventure', icon: 'explore' },
    { id: 4, name: 'Comedy', icon: 'sentiment-satisfied' },
    { id: 8, name: 'Drama', icon: 'theater-comedy' },
    { id: 10, name: 'Fantasy', icon: 'auto-fix-high' },
    { id: 22, name: 'Romance', icon: 'favorite' },
    { id: 24, name: 'Sci-Fi', icon: 'rocket-launch' },
    { id: 14, name: 'Horror', icon: 'warning' },
  ];
};

