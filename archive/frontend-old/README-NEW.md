# AniStream - Clean Architecture

A modern anime streaming application with clean separation between backend and frontend.

## 🏗️ Architecture

```
anistream/
├── backend-hono/      # Hono Framework Backend API
└── frontend-react/    # React TypeScript Frontend
```

## 🚀 Quick Start

### Backend (Hono)

```bash
cd backend-hono
npm install
npm run dev
```

Backend runs on `http://localhost:8801`

### Frontend (React)

```bash
cd frontend-react
npm install
npm run dev
```

Frontend runs on `http://localhost:8800`

## 📁 Project Structure

### Backend (`backend-hono/`)

```
backend-hono/
├── src/
│   ├── index.ts              # Main server entry
│   ├── routes/
│   │   ├── anime.ts          # Anime endpoints
│   │   └── streaming.ts      # Streaming endpoints
│   └── services/
│       ├── animeService.ts   # Anime business logic
│       └── streamingService.ts # Streaming business logic
├── package.json
└── tsconfig.json
```

### Frontend (`frontend-react/`)

```
frontend-react/
├── src/
│   ├── pages/                # Page components
│   │   ├── HomePage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── DetailPage.tsx
│   │   └── WatchPage.tsx
│   ├── components/           # Reusable components
│   │   └── Layout.tsx
│   ├── services/             # API services
│   │   └── api.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

## 🔌 API Endpoints

### Anime
- `GET /api/anime/search?q={query}` - Search anime
- `GET /api/anime/info/:animeId` - Get anime info
- `GET /api/anime/episodes/:animeId` - Get episodes

### Streaming
- `GET /api/streaming/sources?episodeId={id}&server={server}&category={category}` - Get sources
- `GET /api/streaming/servers?episodeId={id}` - Get servers

## 🎯 Features

- ✅ Clean separation of concerns
- ✅ TypeScript throughout
- ✅ Modern frameworks (Hono + React)
- ✅ Fast development with Vite
- ✅ RESTful API design
- ✅ Responsive UI

## 📝 Next Steps

1. Install dependencies in both projects
2. Start backend server
3. Start frontend dev server
4. Open `http://localhost:8800`

## 🔧 Development

Both projects support hot reload:
- Backend: `npm run dev` (uses tsx watch)
- Frontend: `npm run dev` (uses Vite HMR)
