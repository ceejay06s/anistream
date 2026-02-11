import React from 'react';
import { Stack } from 'expo-router';

const RootLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="browse" />
      <Stack.Screen name="search" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="detail/[animeName]" />
      <Stack.Screen name="watch/[animeName]" />
    </Stack>
  );
};

export default RootLayout;
