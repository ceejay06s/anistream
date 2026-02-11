import { useState, useEffect } from 'react';
import { Anime, Category } from '../types';
import {
  fetchTopAnime,
  fetchTrendingAnime,
  fetchSeasonalAnime,
  fetchLatestAnime,
  searchAnime as apiSearchAnime,
} from '../services/metadataApi';

/**
 * Custom hook to fetch and manage anime data
 */
export const useAnimeData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topAnime, setTopAnime] = useState<Anime[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<Anime[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<Anime[]>([]);
  const [latestAnime, setLatestAnime] = useState<Anime[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadAnimeData();
  }, []);

  const loadAnimeData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch different anime lists
      const [top, trending, seasonal, latest] = await Promise.all([
        fetchTopAnime(1, 20),
        fetchTrendingAnime(),
        fetchSeasonalAnime(),
        fetchLatestAnime(),
      ]);

      setTopAnime(top);
      setTrendingAnime(trending);
      setSeasonalAnime(seasonal);
      setLatestAnime(latest);

      // Create categories from fetched data
      const newCategories: Category[] = [
        {
          id: 'trending',
          name: 'Trending Now',
          animes: trending.slice(0, 10),
        },
        {
          id: 'latest',
          name: 'Latest Releases',
          animes: latest.slice(0, 10),
        },
        {
          id: 'top',
          name: 'Top Rated',
          animes: top.slice(0, 10),
        },
        {
          id: 'seasonal',
          name: 'This Season',
          animes: seasonal.slice(0, 10),
        },
        {
          id: 'action',
          name: 'Action',
          animes: top.filter(a => a.genres.includes('Action')).slice(0, 10),
        },
        {
          id: 'popular',
          name: 'Popular Anime',
          animes: top.slice(10, 20),
        },
      ];

      setCategories(newCategories.filter(cat => cat.animes.length > 0));
    } catch (err) {
      setError('Failed to load anime data. Please check your internet connection.');
      console.error('Error loading anime data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadAnimeData();
  };

  return {
    loading,
    error,
    topAnime,
    trendingAnime,
    seasonalAnime,
    latestAnime,
    categories,
    refresh,
  };
};

/**
 * Custom hook for searching anime
 */
export const useAnimeSearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Anime[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchResults = await apiSearchAnime(query);
      setResults(searchResults);
    } catch (err) {
      setError('Failed to search anime. Please try again.');
      console.error('Error searching anime:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    results,
    error,
    search,
  };
};

