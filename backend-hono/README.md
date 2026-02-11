# AniStream Backend API

Modern backend API built with Hono framework for anime streaming.

## Features

- ⚡ Fast and lightweight with Hono
- 🔍 Anime search
- 📺 Anime information and episodes
- 🎬 Streaming sources
- 🌐 CORS enabled
- 📝 TypeScript

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Server runs on `http://localhost:8801`

## Build

```bash
npm run build
npm start
```

## API Endpoints

### Anime

- `GET /api/anime/search?q={query}` - Search anime
- `GET /api/anime/info/:animeId` - Get anime info
- `GET /api/anime/episodes/:animeId` - Get anime episodes

### Streaming

- `GET /api/streaming/sources?episodeId={id}&server={server}&category={category}` - Get episode sources
- `GET /api/streaming/servers?episodeId={id}` - Get available servers

## Environment Variables

- `PORT` - Server port (default: 8801)
