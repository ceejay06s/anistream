# AniStream

An anime streaming platform with community features, built with React Native (Expo) and Hono backend.

## 📁 Project Structure

```
anistream/
├── docs/              # All documentation
├── scripts/           # Automation scripts
│   └── backend/      # Backend scripts
├── backend-hono/     # Backend API (Hono)
├── frontend-native/  # Frontend (Expo/React Native)
└── functions/        # Firebase Cloud Functions (deprecated)
```

## 🚀 Quick Start

### Backend Setup

```bash
cd backend-hono
npm install
npm run dev
```

See `docs/README_ENV.md` for environment variable setup.

### Frontend Setup

```bash
cd frontend-native
npm install
npm start
```

## 📚 Documentation

All documentation is organized in the `docs/` folder:

- **[Setup Guides](docs/)** - Configuration and setup instructions
- **[Deployment](docs/)** - Deployment guides for various platforms
- **[Testing](docs/TESTING.md)** - Testing documentation

## 🛠️ Scripts

Automation scripts are in `scripts/`:

- **[Backend Scripts](scripts/backend/)** - Environment setup, key generation, etc.

## 🔗 Key Features

- Anime streaming with multiple server support
- Community posts and comments
- User profiles with photo uploads
- Push notifications
- reCAPTCHA protection
- Backblaze B2 file storage

## 📝 License

MIT
