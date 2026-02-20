// Jest setup file for frontend tests
import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));

// Mock Firebase
jest.mock('@/config/firebase', () => ({
  app: {},
  auth: {},
  analytics: {},
  firebaseConfig: {},
}));

// Mock API
jest.mock('@/services/api', () => ({
  API_BASE_URL: 'http://localhost:8801',
  animeApi: {
    search: jest.fn(),
    getInfo: jest.fn(),
    getEpisodes: jest.fn(),
  },
}));

// Increase timeout for async operations
jest.setTimeout(10000);
