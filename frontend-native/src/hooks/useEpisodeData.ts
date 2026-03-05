import { useState, useEffect, useCallback } from 'react';
import { animeApi, Episode, AnimeInfo } from '@/services/api';
import { communityService, Post } from '@/services/communityService';

interface UseEpisodeDataResult {
  episodes: Episode[];
  episodesLoading: boolean;
  animeInfo: AnimeInfo | null;
  posts: Post[];
  loadingPosts: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  loadEpisodePosts: () => Promise<void>;
}

export function useEpisodeData(
  animeId: string | undefined,
  ep: string
): UseEpisodeDataResult {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadEpisodes = async () => {
    if (!animeId) return;
    try {
      setEpisodesLoading(true);
      const episodeList = await animeApi.getEpisodes(animeId);
      setEpisodes(episodeList);
    } catch (err) {
      console.error('Failed to load episodes:', err);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const loadAnimeInfo = async () => {
    if (!animeId) return;
    try {
      const info = await animeApi.getInfo(animeId);
      setAnimeInfo(info);
    } catch (err) {
      console.error('Failed to load anime info:', err);
    }
  };

  const loadEpisodePosts = useCallback(async () => {
    if (!animeId) return;
    try {
      setLoadingPosts(true);
      const animePosts = await communityService.getPostsByAnime(animeId, 50);
      setPosts(animePosts);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [animeId]);

  useEffect(() => {
    if (animeId) {
      loadEpisodes();
      loadAnimeInfo();
      loadEpisodePosts();
    }
  }, [animeId, ep]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadEpisodes(), loadAnimeInfo(), loadEpisodePosts()]);
    setRefreshing(false);
  }, [animeId]);

  return {
    episodes,
    episodesLoading,
    animeInfo,
    posts,
    loadingPosts,
    refreshing,
    onRefresh,
    loadEpisodePosts,
  };
}
