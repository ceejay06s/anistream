import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import AnimeDetailScreen from '../screens/AnimeDetailScreen';
import VideoPlayerScreen from '../screens/VideoPlayerScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen name="AnimeDetail" component={AnimeDetailScreen} />
        <Stack.Screen 
          name="VideoPlayer" 
          component={VideoPlayerScreen}
          options={{
            orientation: 'landscape',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

