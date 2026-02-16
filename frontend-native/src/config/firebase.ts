import { Platform } from 'react-native';

let app: any = null;
let analytics: any = null;
let auth: any = null;

const firebaseConfig = {
  apiKey: "AIzaSyDYyLlE_xE_d_f5E0ppooxJywN8xyR_7_s",
  authDomain: "aniwatch-76fd3.firebaseapp.com",
  projectId: "aniwatch-76fd3",
  storageBucket: "aniwatch-76fd3.firebasestorage.app",
  messagingSenderId: "797841167253",
  appId: "1:797841167253:web:d1e663cdc81467a3059c9c",
  measurementId: "G-Z7F9WKFD8L"
};

if (Platform.OS === 'web') {
  const { initializeApp } = require('firebase/app');
  const { getAnalytics, isSupported } = require('firebase/analytics');
  const { getAuth } = require('firebase/auth');

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  isSupported().then((supported: boolean) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// VAPID key for Web Push Notifications
// Public key (used in frontend)
export const VAPID_PUBLIC_KEY = 'BOGVADtXqA3ANL8EIi9SYcsetjZZ-I3J_saRIIdmj_EOOwGKX8g1KIQTVVgyyok_eu8-6U0Nn6YbSl9y4KxYprE';

export { app, analytics, auth, firebaseConfig };
