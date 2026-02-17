import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';

// Web-only analytics - use require to avoid bundling on native
const SpeedInsights = Platform.OS === 'web'
  ? require('@vercel/speed-insights/react').SpeedInsights
  : () => null;

// Vercel Analytics - web only
const Analytics = Platform.OS === 'web'
  ? require('@vercel/analytics/react').Analytics
  : () => null;

// OTA Updates hook for native platforms
function useOTAUpdates() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const checkForUpdates = async () => {
      try {
        const Updates = require('expo-updates');

        // Don't check for updates in development
        if (__DEV__) return;

        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          // Download the update
          await Updates.fetchUpdateAsync();

          // Alert the user
          Alert.alert(
            'Update Available',
            'A new version has been downloaded. Restart now to apply the update?',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Restart',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ]
          );
        }
      } catch (err) {
        // Silently fail - updates are not critical
        console.log('Failed to check for updates:', err);
      }
    };

    // Check for updates after a short delay to not block app startup
    const timeout = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timeout);
  }, []);
}

export default function RootLayout() {
  // Check for OTA updates on native platforms
  useOTAUpdates();
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          {Platform.OS === 'web' && <SpeedInsights />}
          {Platform.OS === 'web' && <Analytics />}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="detail/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="watch/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="policy" options={{ headerShown: false }} />
            <Stack.Screen name="terms" options={{ headerShown: false }} />
          </Stack>
        </View>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
