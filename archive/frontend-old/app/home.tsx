import React from 'react';
import HomeScreen from '../src/screens/HomeScreen';
import { useNavigationAdapter } from '../src/utils/navigation';

const HomeRoute = () => {
  const navigation = useNavigationAdapter();
  return <HomeScreen navigation={navigation as any} />;
};

export default HomeRoute;
