import React from 'react';
import HomeScreen from '../src/screens/HomeScreen';
import { useNavigationAdapter } from './_nav';

const HomeRoute = () => {
  const navigation = useNavigationAdapter();
  return <HomeScreen navigation={navigation as any} />;
};

export default HomeRoute;
