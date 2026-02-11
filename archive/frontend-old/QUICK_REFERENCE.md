# AniStream - Quick Reference

## 🚀 Commands

```bash
npm start           # Start Expo dev server
npm run ios         # Run on iOS
npm run android     # Run on Android
npm run web         # Run in browser
```

## 📂 Important Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root app component |
| `src/navigation/RootNavigator.tsx` | Main navigation setup |
| `src/data/animeData.ts` | Anime data and categories |
| `src/types/index.ts` | TypeScript type definitions |

## 🎨 Main Components

| Component | Location | Use Case |
|-----------|----------|----------|
| `AnimeCard` | `src/components/` | Display anime in cards |
| `CategoryRow` | `src/components/` | Horizontal anime list |
| `FeaturedAnime` | `src/components/` | Large banner with anime |
| `Header` | `src/components/` | App header with logo |

## 📱 Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Home | `/` | Featured + categories |
| Browse | `/browse` | Grid with filters |
| Search | `/search` | Search anime |
| Profile | `/profile` | User profile |
| Anime Detail | `/anime/:id` | Full anime info |
| Video Player | `/play/:id/:ep` | Video playback |

## 🎯 Key Features Locations

### Adding New Anime
📁 `src/data/animeData.ts` → `animeData` array

### Changing Colors
🎨 Each component's `StyleSheet` object

### Navigation Types
📝 `src/navigation/types.ts`

### Anime Type Definition
📋 `src/types/index.ts` → `Anime` interface

## 🔧 Common Customizations

### Change App Name
```json
// app.json
"name": "YourAppName"
```

### Change Primary Color
```typescript
// Replace #E50914 in StyleSheets
backgroundColor: '#YOUR_COLOR'
```

### Add New Category
```typescript
// src/data/animeData.ts
export const categories: Category[] = [
  {
    id: 'your-category',
    name: 'Your Category Name',
    animes: [animeData[0], animeData[1]],
  },
  // ... existing categories
];
```

### Modify Bottom Tabs
```typescript
// src/navigation/BottomTabNavigator.tsx
<Tab.Screen
  name="YourTab"
  component={YourScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <MaterialIcons name="your-icon" size={size} color={color} />
    ),
  }}
/>
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Metro bundler cache | `npx expo start --clear` |
| Dependency issues | `npm install --legacy-peer-deps` |
| TypeScript errors | Check `tsconfig.json` settings |
| Module not found | Restart dev server |
| iOS build fails | `npx expo run:ios` |

## 📦 Dependencies

### Core
- `expo` - Development platform
- `react-native` - Mobile framework
- `typescript` - Type safety

### Navigation
- `@react-navigation/native` - Navigation core
- `@react-navigation/bottom-tabs` - Bottom tabs
- `@react-navigation/native-stack` - Stack navigation
- `react-native-screens` - Native screens
- `react-native-safe-area-context` - Safe areas

### Features
- `expo-av` - Audio/Video playback
- `expo-linear-gradient` - Gradients
- `@expo/vector-icons` - Material Icons

## 🎨 Design Tokens

```typescript
// Colors
PRIMARY: '#E50914'      // Netflix Red
BACKGROUND: '#000'      // Black
SECONDARY_BG: '#1a1a1a' // Dark Gray
TEXT: '#fff'            // White
SECONDARY_TEXT: '#aaa'  // Light Gray
ACCENT: '#FFD700'       // Gold

// Spacing
SMALL: 8
MEDIUM: 16
LARGE: 24

// Border Radius
CARD: 8
BUTTON: 6
PILL: 20

// Font Sizes
SMALL: 12
REGULAR: 14
MEDIUM: 16
LARGE: 20
XLARGE: 28
```

## 🔗 Useful Links

- [Expo Docs](https://docs.expo.dev/)
- [React Navigation Docs](https://reactnavigation.org/)
- [Material Icons List](https://materialdesignicons.com/)
- [TypeScript Cheatsheet](https://www.typescriptlang.org/cheatsheets)

## 💡 Tips

1. **Hot Reloading**: Save files to see changes instantly
2. **Debug Menu**: Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
3. **Console Logs**: Appear in terminal where you ran `npm start`
4. **Element Inspector**: Enable in debug menu
5. **Performance**: Use `React.memo()` for expensive components

## 📝 Code Snippets

### New Screen Template
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const YourScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});

export default YourScreen;
```

### API Fetch Pattern
```typescript
const [data, setData] = useState<Anime[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('YOUR_API');
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

---

**Need more help?** Check `PROJECT_OVERVIEW.md` or `GETTING_STARTED.md`

