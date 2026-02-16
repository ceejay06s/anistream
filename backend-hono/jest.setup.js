// Jest setup file for backend tests
// This runs before each test file

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '8801';

// Mock Firebase Admin (if needed)
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
    applicationDefault: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    collectionGroup: jest.fn(),
    doc: jest.fn(),
  })),
  storage: jest.fn(() => ({
    bucket: jest.fn(),
  })),
  apps: [],
}));

// Increase timeout for async operations
jest.setTimeout(10000);
