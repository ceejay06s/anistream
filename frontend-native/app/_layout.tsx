import { useEffect, useState, useCallback, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, Image, Animated, Easing } from 'react-native';
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

// OTA Updates — checks during splash screen and auto-applies silently.
// Logs skip reasons so channel/runtime mismatches are easier to diagnose.
type OtaCheckResult =
  | 'skipped_web'
  | 'skipped_dev'
  | 'updates_disabled'
  | 'no_update_available'
  | 'update_applied'
  | 'check_failed';

async function checkAndApplyUpdate(): Promise<OtaCheckResult> {
  if (Platform.OS === 'web') return 'skipped_web';
  try {
    const Updates = require('expo-updates');
    const channel = Updates.channel ?? 'none';
    const runtimeVersion = Updates.runtimeVersion ?? 'unknown';

    if (__DEV__) {
      console.info(
        `[OTA] Skipping startup check in __DEV__ (channel=${channel}, runtime=${runtimeVersion}).`
      );
      return 'skipped_dev';
    }

    if (!Updates.isEnabled) {
      console.info(
        `[OTA] expo-updates is disabled (channel=${channel}, runtime=${runtimeVersion}).`
      );
      return 'updates_disabled';
    }

    console.info(`[OTA] Checking for update (channel=${channel}, runtime=${runtimeVersion}).`);
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) {
      console.info('[OTA] No update available.');
      return 'no_update_available';
    }

    console.info('[OTA] Update found. Fetching...');
    await Updates.fetchUpdateAsync();
    console.info('[OTA] Update downloaded. Reloading app...');
    await Updates.reloadAsync();
    return 'update_applied';
  } catch (err) {
    console.warn('OTA update check failed:', err);
    return 'check_failed';
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
  const progressAnim = useRef(new Animated.Value(0)).current;
  // On native, run startup check and let checkAndApplyUpdate decide skip reasons.
  const isUpdatesRelevant = Platform.OS !== 'web';
  const [updateChecked, setUpdateChecked] = useState(!isUpdatesRelevant);

  // Web: Firestore subscription → browser Notification API + FCM registration
  useBrowserNotifications();
  // Native (Android/iOS): Expo push token registration + foreground handler + tap navigation
  useNativeNotifications();

  // Run OTA update check during splash when updates are relevant (native release).
  // Timeout so app never hangs if the update server is slow or unreachable.
  useEffect(() => {
    if (!isUpdatesRelevant) return;
    const timeoutMs = 8000;
    const timeoutId = setTimeout(() => setUpdateChecked(true), timeoutMs);
    checkAndApplyUpdate()
      .then(result => {
        console.info(`[OTA] Startup check result: ${result}`);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setUpdateChecked(true);
      });
    return () => clearTimeout(timeoutId);
  }, [isUpdatesRelevant]);

  // Progress bar: animate 0 → 0.85 over 2.5s while loading (smooth indeterminate feel)
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 2500,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [progressAnim]);

  // When auth + update ready, animate progress to 100% then mark app ready
  useEffect(() => {
    if (authLoading || !updateChecked) return;
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease),
    }).start(({ finished }) => {
      if (finished) setAppReady(true);
    });
  }, [authLoading, updateChecked, progressAnim]);

  // Fallback: never stay on splash longer than 8s (e.g. auth or update check stuck on Android)
  useEffect(() => {
    const maxWaitMs = 8000;
    const id = setTimeout(() => {
      progressAnim.setValue(1);
      setAppReady(true);
    }, maxWaitMs);
    return () => clearTimeout(id);
  }, [progressAnim]);

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
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../assets/logo-w-text.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
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
  progressTrack: {
    width: 240,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e50914',
    borderRadius: 2,
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
