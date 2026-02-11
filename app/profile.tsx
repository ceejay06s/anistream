import React from 'react';
import ProfileScreen from '../src/screens/ProfileScreen';
import { useNavigationAdapter } from '../src/utils/navigation';

const ProfileRoute = () => {
  const navigation = useNavigationAdapter();
  return <ProfileScreen navigation={navigation as any} />;
};

export default ProfileRoute;
