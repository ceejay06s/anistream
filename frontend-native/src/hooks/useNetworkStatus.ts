import { useState, useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNativeConnection = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: use navigator.onLine + online/offline events
      const handleOnline = () => setIsConnected(true);
      const handleOffline = () => setIsConnected(false);

      setIsConnected(typeof navigator !== 'undefined' ? navigator.onLine : true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // Native: check on mount + every 15 seconds + on app foreground
      checkNativeConnection();
      intervalRef.current = setInterval(checkNativeConnection, 15000);

      const handleAppStateChange = (state: AppStateStatus) => {
        if (state === 'active') {
          checkNativeConnection();
        }
      };
      const subscription = AppState.addEventListener('change', handleAppStateChange);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        subscription.remove();
      };
    }
  }, []);

  return { isConnected };
}
