import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
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

export default function RootLayout() {
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
