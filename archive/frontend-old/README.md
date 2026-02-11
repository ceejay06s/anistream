# AniStream - Anime Streaming App

A beautiful Netflix-style anime streaming app built with React Native, Expo, and TypeScript.

## ✨ New Feature: Real Anime Data!

**The app now fetches real anime data from legitimate APIs:**
- ✅ **Jikan API** (MyAnimeList) - Top anime, search, details
- ✅ **AniList API** - Trending anime, high-quality images
- ✅ **Thousands of anime** with real metadata and images
- ✅ **Live search** with actual results
- ✅ **Pull-to-refresh** to reload data

See `API_INTEGRATION.md` for full details!

## Features

- 🌐 **Real anime data** from MyAnimeList & AniList APIs
- 🎬 Netflix-inspired UI design
- 📱 Bottom tab navigation (Home, Browse, Search, Profile)
- 🎥 Video player with custom controls
- 🔍 Live search with real-time API results
- 📋 Browse anime by genre
- ⭐ Rating display and anime details
- 🎯 Featured anime section (real trending anime)
- 📊 User profile with stats
- 🎨 Material Icons throughout the app
- 🌙 Dark theme optimized for viewing
- 🔄 Pull-to-refresh for fresh data

## Screens

1. **Home Screen** - Featured anime and category rows
2. **Browse Screen** - Grid view with genre filtering
3. **Search Screen** - Search anime by title or genre
4. **Profile Screen** - User info, stats, and settings
5. **Anime Detail Screen** - Full anime information with episodes
6. **Video Player Screen** - Full-screen video playback

## Tech Stack

- React Native
- Expo SDK 54
- TypeScript
- React Navigation (Stack & Bottom Tabs)
- Expo AV (Video Player)
- Expo Linear Gradient
- React Native Safe Area Context
- Material Icons

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your platform:
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Project Structure

```
anistream/
├── src/
│   ├── components/        # Reusable components
│   │   ├── AnimeCard.tsx
│   │   ├── CategoryRow.tsx
│   │   ├── FeaturedAnime.tsx
│   │   └── Header.tsx
│   ├── data/             # Mock data
│   │   └── animeData.ts
│   ├── navigation/       # Navigation setup
│   │   ├── BottomTabNavigator.tsx
│   │   ├── RootNavigator.tsx
│   │   └── types.ts
│   ├── screens/          # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── BrowseScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── AnimeDetailScreen.tsx
│   │   └── VideoPlayerScreen.tsx
│   └── types/            # TypeScript types
│       └── index.ts
├── App.tsx              # Root component
└── package.json
```

## Customization

### Adding Your Own Anime Data

Edit `src/data/animeData.ts` to add your own anime with:
- Title
- Cover and banner images
- Description
- Episodes count
- Rating
- Genres
- Studio information

### Changing Theme Colors

The app uses a Netflix-inspired color scheme:
- Primary: `#E50914` (Netflix Red)
- Background: `#000000` (Black)
- Secondary Background: `#1a1a1a`
- Text: `#ffffff` (White)
- Secondary Text: `#aaa`

## Notes

- ✅ **The app now uses REAL anime data** from Jikan (MyAnimeList) and AniList APIs
- ✅ **Real images** - High-quality cover and banner images
- ✅ **Real metadata** - Ratings, genres, descriptions, episode counts
- ✅ **Live search** - Search thousands of anime in real-time
- Video player uses a sample video (integrate with anime streaming service for production)
- See `API_INTEGRATION.md` for complete API documentation

## Future Enhancements

- ✅ ~~Integration with real anime API~~ **DONE!**
- User authentication and favorites
- Download for offline viewing
- Continue watching functionality
- Multiple language support
- Push notifications for new episodes
- Social features (comments, ratings)

## License

MIT License

