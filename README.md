# AniStream

A modern anime streaming platform with community features, built with React Native (Expo) and a Hono backend API. Stream anime, browse by categories and genres, interact with the community, and manage your watchlist.

## ✨ Features

### 🎬 Streaming
- **Multi-server streaming** - Choose from multiple streaming servers
- **HD video playback** - High-quality video streaming with HLS support
- **Subtitle support** - Multiple subtitle tracks and languages
- **Video controls** - Playback controls, quality selection, and fullscreen mode
- **Background playback** - Continue watching while using other apps (iOS)

### 🔍 Discovery
- **Browse by categories** - Top Airing, Most Popular, Recently Added, and more
- **Genre filtering** - Browse by 40+ anime genres
- **A-Z browsing** - Alphabetical anime listing
- **Search** - Powerful search with real-time results
- **Responsive grid** - Adaptive layout for mobile, tablet, and desktop

### 👥 Community
- **Posts & Comments** - Share thoughts and engage with the community
- **User profiles** - Customizable profiles with photo uploads
- **Activity feed** - Stay updated with community activity

### 🔔 Notifications
- **Push notifications** - Get notified about new episodes and updates
- **Web push support** - Browser notifications for web platform

### 🛡️ Security
- **reCAPTCHA protection** - Bot protection for forms
- **Firebase Authentication** - Secure user authentication
- **CORS enabled** - Secure API access

### ☁️ Storage
- **Backblaze B2 integration** - Scalable file storage
- **Firebase Storage** - Alternative storage option
- **Image proxy** - Optimized image delivery

## 🛠️ Tech Stack

### Frontend
- **React Native** (0.81.5) - Cross-platform mobile framework
- **Expo** (~54.0.0) - Development platform and tooling
- **Expo Router** (~6.0.23) - File-based routing
- **TypeScript** (~5.9.2) - Type safety
- **React** (19.1.0) - UI library
- **Expo Video** (~3.0.16) - Video playback
- **Firebase** (^12.9.0) - Authentication and storage
- **HLS.js** (^1.6.0) - HLS video streaming

### Backend
- **Hono** (^4.6.0) - Fast web framework
- **TypeScript** (^5.9.2) - Type safety
- **AniWatch API** (^2.24.3) - Anime data source
- **Firebase Admin SDK** (^12.0.0) - Server-side Firebase
- **AWS SDK** (^3.990.0) - Backblaze B2 integration
- **Upstash Redis** (^1.36.2) - Caching
- **WebSockets** (ws ^8.19.0) - Real-time communication

## 📁 Project Structure

```
anistream/
├── frontend-native/     # React Native/Expo frontend
│   ├── app/            # Expo Router pages
│   │   ├── (tabs)/     # Tab navigation screens
│   │   ├── detail/     # Anime detail page
│   │   └── watch/      # Video player page
│   ├── src/            # Source code
│   │   ├── components/ # Reusable components
│   │   ├── services/   # API services
│   │   ├── hooks/      # Custom React hooks
│   │   └── utils/      # Utility functions
│   └── assets/         # Images and static files
│
├── backend-hono/        # Hono backend API
│   ├── src/            # Source code
│   │   ├── routes/     # API route handlers
│   │   ├── services/   # Business logic
│   │   ├── config/     # Configuration files
│   │   └── utils/      # Utility functions
│   └── dist/           # Compiled output
│
├── functions/           # Firebase Cloud Functions (deprecated)
├── docs/               # Documentation
│   ├── Setup guides    # Configuration instructions
│   ├── Deployment      # Deployment guides
│   └── Testing         # Testing documentation
│
└── scripts/            # Automation scripts
    └── backend/        # Backend setup scripts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (installed globally or via npx)
- **Firebase account** (for authentication and storage)
- **Backblaze B2 account** (optional, for file storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd anistream
   ```

2. **Install backend dependencies**
   ```bash
   cd backend-hono
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend-native
   npm install
   ```

### Environment Setup

#### Backend Environment Variables

1. Navigate to `backend-hono` directory
2. Copy the environment template:
   ```bash
   cp ENV_TEMPLATE.txt .env
   ```

3. Set up environment variables (see [Environment Variables Guide](docs/README_ENV.md)):
   - **Firebase Service Account** - Base64 encoded service account JSON
   - **Backblaze B2 Credentials** - Key ID and Application Key
   - **VAPID Keys** - For push notifications
   - **reCAPTCHA Secret** - For bot protection

   Or use the automated setup script:
   ```powershell
   ..\scripts\backend\setup-env.ps1
   ```

#### Frontend Configuration

1. Add Firebase configuration in `frontend-native/src/services/` (if needed)
2. Configure API endpoint in `frontend-native/src/services/api.ts`

### Running the Application

#### Backend Development

```bash
cd backend-hono
npm run dev
```

Backend API runs on `http://localhost:8801`

#### Frontend Development

```bash
cd frontend-native
npm start
```

Then choose your platform:
- Press `w` for web
- Press `a` for Android
- Press `i` for iOS
- Scan QR code with Expo Go app

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

### Setup & Configuration
- **[Environment Variables](docs/README_ENV.md)** - Backend environment setup
- **[Backblaze Setup](docs/BACKBLAZE_SETUP.md)** - Backblaze B2 storage configuration
- **[reCAPTCHA Setup](docs/RECAPTCHA_SETUP.md)** - reCAPTCHA integration
- **[VAPID Setup](docs/VAPID_SETUP.md)** - Web Push Notifications
- **[Web Push Setup](docs/WEB_PUSH_SETUP.md)** - Push notification configuration

### Deployment
- **[Deploy to Render](docs/DEPLOY_TO_RENDER.md)** - Render deployment guide
- **[Render Deploy](docs/RENDER_DEPLOY.md)** - Detailed Render instructions
- **[Render Fix](docs/RENDER_FIX.md)** - Troubleshooting Render deployment

### Firebase & Cloud Services
- **[Cloud Functions Setup](docs/CLOUD_FUNCTIONS_SETUP.md)** - Firebase Cloud Functions
- **[No Blaze Setup](docs/NO_BLAZE_SETUP.md)** - Setup without Firebase Blaze plan
- **[Firebase Storage CORS Fix](docs/FIREBASE_STORAGE_CORS_FIX.md)** - CORS issues resolution

### Testing
- **[Testing Guide](docs/TESTING.md)** - Comprehensive testing documentation
- **[Testing Summary](docs/TESTING_SUMMARY.md)** - Quick testing overview

## 🧪 Testing

### Backend Tests

```bash
cd backend-hono
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Frontend Tests

```bash
cd frontend-native
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 🏗️ Building

### Backend Build

```bash
cd backend-hono
npm run build
npm start
```

### Frontend Build

#### Web
```bash
cd frontend-native
npm run build:web
```

#### Mobile (EAS Build)
```bash
cd frontend-native
eas build --platform android
eas build --platform ios
```

## 📱 Platform Support

- ✅ **Web** - Full support with responsive design
- ✅ **Android** - Native Android app
- ✅ **iOS** - Native iOS app
- ✅ **Tablet** - Optimized tablet layouts

## 🔌 API Endpoints

### Anime
- `GET /api/anime/search?q={query}` - Search anime
- `GET /api/anime/info/:animeId` - Get anime information
- `GET /api/anime/episodes/:animeId` - Get anime episodes
- `GET /api/anime/category/:category` - Get anime by category
- `GET /api/anime/genre/:genre` - Get anime by genre
- `GET /api/anime/az/:letter` - Get anime by A-Z

### Streaming
- `GET /api/streaming/sources?episodeId={id}&server={server}&category={category}` - Get episode sources
- `GET /api/streaming/servers?episodeId={id}` - Get available servers

### Community
- `GET /api/community/posts` - Get community posts
- `POST /api/community/posts` - Create a post
- `GET /api/community/posts/:id/comments` - Get post comments
- `POST /api/community/posts/:id/comments` - Add comment

See `backend-hono/README.md` for complete API documentation.

## 🛠️ Scripts

Automation scripts are available in `scripts/`:

- **Backend Scripts** (`scripts/backend/`)
  - `setup-env.ps1` - Automated environment setup
  - `get-base64-key.ps1` - Generate base64 service account
  - `setup-backblaze.ps1` - Backblaze configuration

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [AniWatch](https://aniwatch.to/) - Anime data source
- [Expo](https://expo.dev/) - Development platform
- [Hono](https://hono.dev/) - Web framework
- [Firebase](https://firebase.google.com/) - Backend services

## 📞 Support

For issues and questions:
- Check the [Documentation](docs/)
- Review [Testing Guide](docs/TESTING.md)
- Open an issue on GitHub

---

**Made with ❤️ for anime fans**
