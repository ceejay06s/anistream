import React from 'react';
import SearchScreen from '../src/screens/SearchScreen';
import { useNavigationAdapter } from './_nav';

const SearchRoute = () => {
  const navigation = useNavigationAdapter();
  return <SearchScreen navigation={navigation as any} />;
};

export default SearchRoute;
