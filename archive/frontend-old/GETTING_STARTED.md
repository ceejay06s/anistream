# Getting Started with AniStream

## 🚀 Quick Start

1. **Install Dependencies** (Already Done!)
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm start
   ```

3. **Run on Your Device**
   
   After starting the server, you'll see a QR code in the terminal:
   
   - **iOS Device**: Download "Expo Go" from App Store → Scan QR code
   - **Android Device**: Download "Expo Go" from Google Play → Scan QR code
   - **iOS Simulator**: Press `i` in the terminal (requires Xcode)
   - **Android Emulator**: Press `a` in the terminal (requires Android Studio)
   - **Web Browser**: Press `w` in the terminal

## 📱 Available Commands

```bash
npm start           # Start Expo dev server with QR code
npm run android     # Run on Android emulator
npm run ios         # Run on iOS simulator
npm run web         # Run in web browser
```

## ✨ What You Can Do

### Explore the App
1. **Home Screen** - Scroll through featured anime and category rows
2. **Browse Tab** - Filter anime by genre (Action, Comedy, Drama, etc.)
3. **Search Tab** - Search for anime by name or genre
4. **Profile Tab** - View user stats and settings
5. **Tap Any Anime** - View detailed information and episode list
6. **Play Button** - Watch anime episodes in the video player

### Navigate Around
- Tap bottom tabs to switch between main screens
- Tap any anime card to see details
- Use the back button to return to previous screen
- Tap play button to watch episodes

## 🎨 Customize the App

### Change App Colors
Edit the colors in any component's StyleSheet:
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',  // ← Change this
  },
});
```

### Add Your Own Anime
Edit `src/data/animeData.ts` and add to the `animeData` array:
```typescript
{
  id: '11',
  title: 'Your Anime Title',
  coverImage: 'https://your-image-url.com/cover.jpg',
  bannerImage: 'https://your-image-url.com/banner.jpg',
  description: 'An amazing anime about...',
  episodes: 24,
  rating: 8.5,
  year: 2024,
  genres: ['Action', 'Adventure'],
  status: 'Ongoing',
  duration: '24 min',
  studio: 'Your Studio',
}
```

### Add More Categories
In `src/data/animeData.ts`, add to the `categories` array:
```typescript
{
  id: 'romance',
  name: 'Romance Anime',
  animes: [animeData[0], animeData[3]],
}
```

## 🐛 Troubleshooting

### "Command not found" Error
Make sure you're in the project directory:
```bash
cd anistream
```

### Metro Bundler Issues
Clear the cache and restart:
```bash
npx expo start --clear
```

### Can't See the App on Device
1. Make sure your phone and computer are on the same Wi-Fi
2. Download "Expo Go" app from App Store or Google Play
3. Scan the QR code in the terminal

### TypeScript Errors
The project is properly configured with TypeScript. If you see errors:
```bash
npx tsc --noEmit
```

### iOS Simulator Not Opening
Make sure Xcode is installed:
```bash
xcode-select --install
```

### Android Emulator Not Opening
Make sure Android Studio is installed with an AVD (Android Virtual Device) set up.

## 📚 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── AnimeCard.tsx
│   ├── CategoryRow.tsx
│   ├── FeaturedAnime.tsx
│   └── Header.tsx
│
├── data/            # Mock anime data
│   └── animeData.ts
│
├── navigation/      # App navigation
│   ├── BottomTabNavigator.tsx
│   ├── RootNavigator.tsx
│   └── types.ts
│
├── screens/         # Main app screens
│   ├── HomeScreen.tsx
│   ├── BrowseScreen.tsx
│   ├── SearchScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── AnimeDetailScreen.tsx
│   └── VideoPlayerScreen.tsx
│
└── types/           # TypeScript types
    └── index.ts
```

## 🎯 Next Steps

### For Development
1. Explore the code in the `src/` folder
2. Modify colors and styling to your liking
3. Add more anime to the data file
4. Customize the UI components

### For Production
1. **Get Real Data**: Integrate with an anime API:
   - AniList API (https://anilist.co/graphiql)
   - MyAnimeList API
   - Jikan API (https://jikan.moe/)

2. **Add Authentication**: 
   - Firebase Authentication
   - Auth0
   - Custom backend

3. **Add Features**:
   - User favorites/watchlist
   - Continue watching
   - Download episodes
   - Push notifications
   - Comments and ratings

4. **Build for Production**:
   ```bash
   # Build standalone app
   eas build --platform ios
   eas build --platform android
   ```

## 📖 Learn More

- **React Native**: https://reactnative.dev/
- **Expo Documentation**: https://docs.expo.dev/
- **React Navigation**: https://reactnavigation.org/
- **TypeScript**: https://www.typescriptlang.org/

## 💡 Tips

1. **Fast Refresh**: Just save your files and the app updates automatically
2. **Debug Menu**: Shake your device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
3. **Console Logs**: Check the terminal where you ran `npm start`
4. **Inspect Elements**: Enable in the debug menu
5. **Reload App**: Press `r` in the terminal

## ❓ Need Help?

Check out these other documentation files:
- `README.md` - Full project documentation
- `PROJECT_OVERVIEW.md` - Detailed project breakdown
- `QUICK_REFERENCE.md` - Quick command reference

---

**Enjoy building with AniStream!** 🎬✨

If you encounter any issues, make sure all dependencies are installed correctly and you're running the latest version of Node.js (v16 or higher recommended).

