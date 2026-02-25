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
- `ANIWATCH_PROVIDER` - `api` (default) for `ghoshRitesh12/aniwatch-api`, `itzzzme-api` for `tzzzme/itzzzme` style API, or `package` for direct npm scraper
- `ANIWATCH_API_URL` - Base URL for self-hosted aniwatch-api (default: `http://localhost:4000`)
- `ANIWATCH_API_BASE_PATH` - API base path (default: `/api/v2/hianime`)
- `ITZZZME_API_URL` - Base URL for `itzzzme-api` when `ANIWATCH_PROVIDER=itzzzme-api` (default: `http://localhost:3000`)
- `ITZZZME_API_BASE_PATH` - API base path for `itzzzme-api` (default: `/api`)
- `ANIWATCH_API_TIMEOUT_MS` - Upstream request timeout in ms (default: `12000`)
- `ANIWATCH_API_FALLBACK_TO_PACKAGE` - `true` to fallback to npm scraper if API request fails (default: `true`)
