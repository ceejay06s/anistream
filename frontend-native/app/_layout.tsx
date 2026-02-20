import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import * as SplashScreen from 'expo-splash-screen';

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync();

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

// Offline banner shown globally when there's no internet
function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  if (isConnected) return null;
  return (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.offlineBannerText}>No internet connection</Text>
    </View>
  );
}

// Inner layout that waits for auth to be ready
function AppContent() {
  const { loading: authLoading } = useAuth();
  const [appReady, setAppReady] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);

  // Check for OTA updates on native platforms
  useOTAUpdates();

  // Subscribe to Firestore notifications and show browser push notifications
  useBrowserNotifications();

  // Mark app as ready when auth is loaded
  useEffect(() => {
    if (!authLoading) {
      setAppReady(true);
    }
  }, [authLoading]);

  // Hide splash screen when app is ready
  const onLayoutRootView = useCallback(async () => {
    if (appReady && !splashHidden) {
      // Add a small delay for smoother transition
      await new Promise(resolve => setTimeout(resolve, 200));
      await SplashScreen.hideAsync();
      setSplashHidden(true);
    }
  }, [appReady, splashHidden]);

  // Show loading screen while initializing (only on web after JS loads)
  if (!appReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../assets/logo-w-text.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#e50914" style={styles.loadingSpinner} />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      {Platform.OS === 'web' && <SpeedInsights />}
      {Platform.OS === 'web' && <Analytics />}
      <OfflineBanner />
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
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 200,
    height: 60,
    marginBottom: 32,
  },
  loadingSpinner: {
    marginTop: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#b91c1c',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
