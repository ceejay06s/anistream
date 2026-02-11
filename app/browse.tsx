import React from 'react';
import BrowseScreen from '../src/screens/BrowseScreen';
import { useNavigationAdapter } from '../src/utils/navigation';

const BrowseRoute = () => {
  const navigation = useNavigationAdapter();
  return <BrowseScreen navigation={navigation as any} />;
};

export default BrowseRoute;
