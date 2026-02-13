import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDYyLlE_xE_d_f5E0ppooxJywN8xyR_7_s",
  authDomain: "aniwatch-76fd3.firebaseapp.com",
  projectId: "aniwatch-76fd3",
  storageBucket: "aniwatch-76fd3.firebasestorage.app",
  messagingSenderId: "797841167253",
  appId: "1:797841167253:web:d1e663cdc81467a3059c9c",
  measurementId: "G-Z7F9WKFD8L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only on web)
let analytics: ReturnType<typeof getAnalytics> | null = null;

if (Platform.OS === 'web') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, analytics };
