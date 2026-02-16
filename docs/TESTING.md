# Testing Guide

This document provides information about the unit testing setup for the AniStream project.

## Overview

The project uses [Jest](https://jestjs.io/) as the testing framework for both backend and frontend code.

## Backend Testing

### Location
Backend tests are located in `backend-hono/src/**/__tests__/` directories.

### Running Tests

```bash
cd backend-hono
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Test Files

- **Routes Tests**: `src/routes/__tests__/`
  - `anime.test.ts` - Anime API endpoints
  - `streaming.test.ts` - Streaming endpoints
  - `upload.test.ts` - File upload endpoints
  - `recaptcha.test.ts` - reCAPTCHA verification
  - `notifications.test.ts` - Notification endpoints

- **Service Tests**: `src/services/__tests__/`
  - `animeService.test.ts` - Anime data service
  - `streamingService.test.ts` - Streaming service

- **Config Tests**: `src/config/__tests__/`
  - `backblaze.test.ts` - Backblaze B2 configuration

- **Utility Tests**: `src/utils/__tests__/`
  - `recaptcha.test.ts` - reCAPTCHA utility functions

## Frontend Testing

### Location
Frontend tests are located in `frontend-native/src/**/__tests__/` directories.

### Running Tests

```bash
cd frontend-native
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Test Files

- **Service Tests**: `src/services/__tests__/`
  - `communityService.test.ts` - Community features (posts, comments)
  - `profileService.test.ts` - Profile photo uploads

- **Utility Tests**: `src/utils/__tests__/`
  - `imageProxy.test.ts` - Image proxy utility
  - `recaptcha.test.ts` - reCAPTCHA frontend utilities

## Test Structure

Each test file follows this structure:

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('Function Name', () => {
    it('should do something correctly', () => {
      // Test implementation
    });
  });
});
```

## Mocking

### Backend Mocks

- **Firebase Admin**: Mocked in `jest.setup.js`
- **External APIs**: Services are mocked in individual test files
- **AWS SDK**: Backblaze S3 client is mocked in upload tests

### Frontend Mocks

- **React Native**: Platform and modules mocked in `jest.setup.js`
- **Firebase**: Firebase config mocked
- **Expo Router**: Navigation mocked
- **API Services**: Axios and API calls mocked

## Coverage

Coverage reports are generated in the `coverage/` directory for both backend and frontend.

### Viewing Coverage

```bash
# Backend
cd backend-hono
npm run test:coverage
open coverage/index.html

# Frontend
cd frontend-native
npm run test:coverage
open coverage/index.html
```

## Writing New Tests

### Backend Test Example

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { myRoute } from '../myRoute.js';
import * as myService from '../../services/myService.js';

jest.mock('../../services/myService.js');

describe('My Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle request correctly', async () => {
    (myService.myFunction as jest.Mock).mockResolvedValue({ data: 'test' });

    const req = new Request('http://localhost/api/my-route');
    const res = await myRoute.fetch(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBe('test');
  });
});
```

### Frontend Test Example

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { myService } from '../myService';

jest.mock('axios');
jest.mock('@/config/firebase');

describe('My Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform action correctly', async () => {
    const result = await myService.myFunction('input');
    expect(result).toBeDefined();
  });
});
```

## Continuous Integration

Tests should be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Backend Tests
  run: |
    cd backend-hono
    npm test

- name: Run Frontend Tests
  run: |
    cd frontend-native
    npm test
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies (APIs, databases, etc.)
3. **Clear Names**: Use descriptive test names that explain what is being tested
4. **Coverage**: Aim for high code coverage, especially for critical paths
5. **Fast Tests**: Keep tests fast by mocking slow operations
6. **Error Cases**: Test both success and error scenarios

## Troubleshooting

### Backend Tests

- **Module Resolution**: Ensure `jest.config.js` has correct `moduleNameMapper` for ESM
- **TypeScript**: Check `tsconfig.json` matches Jest configuration
- **Firebase**: Ensure Firebase Admin mocks are set up correctly

### Frontend Tests

- **Expo**: Ensure `jest-expo` preset is configured
- **React Native**: Check that React Native modules are properly mocked
- **Platform**: Set `Platform.OS` appropriately in tests

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Jest Expo](https://github.com/expo/expo/tree/main/packages/jest-expo)
