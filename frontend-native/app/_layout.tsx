import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useNativeNotifications } from '@/hooks/useNativeNotifications';
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

// OTA Updates — checks during splash screen and auto-applies silently
async function checkAndApplyUpdate(): Promise<void> {
  if (Platform.OS === 'web' || __DEV__) return;
  try {
    const Updates = require('expo-updates');
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Silently reload — user sees the new version on next launch instead of a prompt
      await Updates.reloadAsync();
    }
  } catch (err) {
    // Silently fail — updates are non-critical
    console.log('OTA update check failed:', err);
  }
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

// Inner layout that waits for auth + update check to be ready
function AppContent() {
  const { loading: authLoading } = useAuth();
  const [appReady, setAppReady] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);
  // On web or DEV, skip update check immediately; on native production wait for it
  const [updateChecked, setUpdateChecked] = useState(
    Platform.OS === 'web' || __DEV__
  );

  // Web: Firestore subscription → browser Notification API + FCM registration
  useBrowserNotifications();
  // Native (Android/iOS): Expo push token registration + foreground handler + tap navigation
  useNativeNotifications();

  // Run OTA update check during splash — silently applies if available
  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__) return;
    checkAndApplyUpdate().finally(() => setUpdateChecked(true));
  }, []);

  // Mark app as ready when auth is loaded AND update check finished
  useEffect(() => {
    if (!authLoading && updateChecked) {
      setAppReady(true);
    }
  }, [authLoading, updateChecked]);

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
