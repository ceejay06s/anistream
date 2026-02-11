# AniStream

A modern anime streaming application with a React Native mobile app and Hono backend API.

## Project Structure

```
anistream/
├── backend-hono/       # Backend API (Hono + TypeScript)
├── frontend-native/    # Mobile app (React Native + Expo)
└── archive/            # Archived previous implementations
```

## Features

- Browse and search anime
- View anime details and episodes
- Stream episodes with subtitle support
- Cross-platform (Android, iOS, Web)
- Real-time streaming via WebSocket

## Quick Start

### Backend

```bash
cd backend-hono
npm install
npm run dev
```

Server runs on `http://localhost:8801`

### Frontend (Mobile)

```bash
cd frontend-native
npm install
npm start
```

Then:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for Web

## Tech Stack

### Backend
- [Hono](https://hono.dev/) - Fast web framework
- [aniwatch](https://www.npmjs.com/package/aniwatch) - Anime data provider
- WebSocket for real-time streaming
- TypeScript

### Frontend
- [React Native](https://reactnative.dev/) - Cross-platform mobile
- [Expo](https://expo.dev/) - Development framework
- [Expo Router](https://docs.expo.dev/router/introduction/) - File-based routing
- [expo-video](https://docs.expo.dev/versions/latest/sdk/video/) - Video player
- TypeScript

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/anime/search?q={query}` | Search anime |
| `GET /api/anime/info/:animeId` | Get anime details |
| `GET /api/anime/episodes/:animeId` | Get episode list |
| `GET /api/streaming/sources?episodeId={id}` | Get streaming sources |
| `GET /api/streaming/servers?episodeId={id}` | Get available servers |

## License

MIT
