import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import AnimeDetailScreen from '../../src/screens/AnimeDetailScreen';
import { getStringParam, useNavigationAdapter } from '../_nav';

const DetailRoute = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigationAdapter();

  const animeId =
    getStringParam(params.id) ||
    getStringParam(params.animeId) ||
    getStringParam(params.animeName);

  const route = {
    params: {
      animeId,
      anime: undefined,
    },
  } as any;

  return <AnimeDetailScreen navigation={navigation as any} route={route} />;
};

export default DetailRoute;
