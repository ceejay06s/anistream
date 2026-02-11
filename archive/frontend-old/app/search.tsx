import React from 'react';
import SearchScreen from '../src/screens/SearchScreen';
import { useNavigationAdapter } from '../src/utils/navigation';

const SearchRoute = () => {
  const navigation = useNavigationAdapter();
  return <SearchScreen navigation={navigation as any} />;
};

export default SearchRoute;
