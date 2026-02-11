import React from 'react';
import BrowseScreen from '../src/screens/BrowseScreen';
import { useNavigationAdapter } from './_nav';

const BrowseRoute = () => {
  const navigation = useNavigationAdapter();
  return <BrowseScreen navigation={navigation as any} />;
};

export default BrowseRoute;
