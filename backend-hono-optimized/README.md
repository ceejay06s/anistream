# AniStream Backend (Optimized)

This folder is a streamlined rebuild of `backend-hono` focused on simpler workflow and lower runtime cost.

## What Changed

### 1) Anime update workflow optimized
- Old flow: API call per user-anime entry (`O(total watching entries)` remote calls).
- New flow: deduplicate by `animeId`, then fetch upstream info once per unique anime (`O(unique anime)` remote calls).
- Uses concurrency limits for upstream lookups and push sends.
- Uses Firestore `bulkWriter` for notification/news/update writes in one pass.
- Creates one `news` item per updated anime instead of duplicating the same news per user.

### 2) Duplicated notification push logic removed
- Added shared service: `src/services/pushNotificationService.ts`.
- `POST /api/notifications/send-push` and anime update cron both use the same sender.

### 3) Streaming resolution workflow unified
- Added shared resolver: `src/services/streamResolver.ts`.
- HTTP and WebSocket now use the same fallback/cache strategy.
- Reuses cached successful server and tracks failed servers.
- Added fallback episode lookup cache to reduce repeated `/info` calls to fallback APIs.

### 4) Service and route simplification
- `animeService` filter/list mapping logic was deduplicated.
- Anime routes now use shared filter parsing and consistent error handling.
- Firebase config rewritten to be ESM-safe.
- Removed hardcoded reCAPTCHA secret fallback.

### 5) Firestore indexes added
- See [`firestore.indexes.json`](./firestore.indexes.json) for query indexes used by updates/notifications/news feeds.

## Setup

```bash
cd backend-hono-optimized
npm install
npm run dev
```

Server default: `http://localhost:8801`

## Validation Commands

```bash
npm run type-check
npm test
```

## Environment Notes

Main vars are the same as `backend-hono`, with two optional tuning vars for the new update algorithm:

- `ANIME_UPDATE_INFO_CONCURRENCY` (default: `8`)
- `ANIME_UPDATE_PUSH_CONCURRENCY` (default: `10`)

Optional streaming fallback lookup cache TTL:

- `STREAMING_FALLBACK_EP_LOOKUP_TTL_MS` (default: `600000`)
