import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import VideoPlayerScreen from '../../src/screens/VideoPlayerScreen';
import { getEpisodeIdFromParams, getStringParam, useNavigationAdapter } from '../_nav';

const WatchRoute = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigationAdapter();

  const animeId =
    getStringParam(params.id) ||
    getStringParam(params.animeId) ||
    getStringParam(params.animeName);

  const episodeId = getEpisodeIdFromParams(params as Record<string, unknown>);
  const episodeNumber = getStringParam(params.ep);
  const episodeUrl = getStringParam(params.episodeUrl);
  const animeTitle =
    getStringParam(params.title) ||
    getStringParam(params.animeTitle) ||
    getStringParam(params.animeName);
  const source = getStringParam(params.source);

  const route = {
    params: {
      animeId,
      episodeId,
      animeTitle,
      episodeNumber: episodeNumber ? Number(episodeNumber) : undefined,
      episodeUrl,
      source,
    },
  } as any;

  return <VideoPlayerScreen navigation={navigation as any} route={route} />;
};

export default WatchRoute;
