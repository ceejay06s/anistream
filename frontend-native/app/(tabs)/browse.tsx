import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { animeApi, Anime } from '@/services/api';
import {
  exploreRoutes,
  routeDisplayNames,
  genres,
  azList,
  capitalizeGenre,
  ExploreRoute,
  Genre,
  AZOption,
} from '@/data/meta';

type BrowseMode = 'category' | 'genre' | 'az';

export default function BrowseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; genre?: string; az?: string }>();
  const { width } = useWindowDimensions();

  const [browseMode, setBrowseMode] = useState<BrowseMode>('category');
  const [selectedCategory, setSelectedCategory] = useState<ExploreRoute>('most-popular');
  const [selectedGenre, setSelectedGenre] = useState<Genre>('action');
  const [selectedAZ, setSelectedAZ] = useState<AZOption>('all');
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Calculate responsive columns based on screen width
  const getNumColumns = () => {
    if (width < 600) return 2;      // Mobile
    if (width < 900) return 3;       // Tablet
    if (width < 1200) return 4;      // Small desktop
    if (width < 1600) return 5;      // Medium desktop
    return 6;                        // Large desktop
  };

  const numColumns = getNumColumns();
  
  // Calculate item width based on columns and padding
  const getItemWidth = () => {
    const padding = width < 600 ? 16 : 24; // Less padding on mobile
    const gap = 8; // Gap between items
    const availableWidth = width - (padding * 2);
    const totalGap = gap * (numColumns - 1);
    return (availableWidth - totalGap) / numColumns;
  };

  const itemWidth = getItemWidth();
  const gridPadding = width < 600 ? 8 : 24;

  // Calculate genre grid columns for expanded view
  const getGenreGridColumns = () => {
    if (width < 600) return 4;      // Mobile: 4 columns
    if (width < 900) return 5;       // Tablet: 5 columns
    if (width < 1200) return 6;      // Small desktop: 6 columns
    return 7;                        // Large desktop: 7 columns
  };

  const genreGridColumns = getGenreGridColumns();

  // Handle URL params from home page "See All" links
  useEffect(() => {
    if (params.category && exploreRoutes.includes(params.category as ExploreRoute)) {
      setBrowseMode('category');
      setSelectedCategory(params.category as ExploreRoute);
    } else if (params.genre && genres.includes(params.genre as Genre)) {
      setBrowseMode('genre');
      setSelectedGenre(params.genre as Genre);
    } else if (params.az && azList.includes(params.az as AZOption)) {
      setBrowseMode('az');
      setSelectedAZ(params.az as AZOption);
    }
  }, [params.category, params.genre, params.az]);

  // Load data when selection changes
  useEffect(() => {
    loadData();
  }, [browseMode, selectedCategory, selectedGenre, selectedAZ]);

  const loadData = async () => {
    try {
      setLoading(true);
      let data: Anime[] = [];

      switch (browseMode) {
        case 'category':
          data = await animeApi.getByCategory(selectedCategory);
          break;
        case 'genre':
          data = await animeApi.getByGenre(selectedGenre);
          break;
        case 'az':
          data = await animeApi.getByAZ(selectedAZ);
          break;
      }

      setAnimeList(data);
    } catch (err) {
      console.error('Failed to load data:', err);
      setAnimeList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimePress = (anime: Anime) => {
    router.push(`/detail/${anime.id}`);
  };

  const getCurrentTitle = () => {
    switch (browseMode) {
      case 'category':
        return routeDisplayNames[selectedCategory];
      case 'genre':
        return capitalizeGenre(selectedGenre);
      case 'az':
        return selectedAZ === 'all' ? 'All Anime' : `Starts with "${selectedAZ.toUpperCase()}"`;
    }
  };

  const renderAnimeItem = ({ item, index }: { item: Anime; index: number }) => {
    const isLastInRow = (index + 1) % numColumns === 0;
    return (
      <TouchableOpacity
        style={[
          styles.animeItem,
          { width: itemWidth },
          !isLastInRow && { marginRight: 8 }
        ]}
        onPress={() => handleAnimePress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.poster }}
          style={styles.animePoster}
          resizeMode="cover"
        />
        <View style={styles.animeInfo}>
          <Text style={styles.animeTitle} numberOfLines={2}>
            {item.name}
          </Text>
          {item.type && <Text style={styles.animeType}>{item.type}</Text>}
          {item.rating && <Text style={styles.animeRating}>★ {item.rating}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[styles.modeButton, browseMode === 'category' && styles.modeButtonActive]}
        onPress={() => setBrowseMode('category')}
      >
        <Ionicons
          name="grid-outline"
          size={16}
          color={browseMode === 'category' ? '#fff' : '#888'}
        />
        <Text style={[styles.modeText, browseMode === 'category' && styles.modeTextActive]}>
          Category
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, browseMode === 'genre' && styles.modeButtonActive]}
        onPress={() => setBrowseMode('genre')}
      >
        <Ionicons
          name="pricetag-outline"
          size={16}
          color={browseMode === 'genre' ? '#fff' : '#888'}
        />
        <Text style={[styles.modeText, browseMode === 'genre' && styles.modeTextActive]}>
          Genre
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, browseMode === 'az' && styles.modeButtonActive]}
        onPress={() => setBrowseMode('az')}
      >
        <Ionicons
          name="text-outline"
          size={16}
          color={browseMode === 'az' ? '#fff' : '#888'}
        />
        <Text style={[styles.modeText, browseMode === 'az' && styles.modeTextActive]}>
          A-Z
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategorySelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={Platform.OS !== 'web'}
      style={[styles.selectorScroll, styles.horizontalScroll]}
      contentContainerStyle={styles.selectorContent}
    >
      {exploreRoutes.map(route => (
        <TouchableOpacity
          key={route}
          style={[
            styles.chip,
            selectedCategory === route && styles.chipActive,
          ]}
          onPress={() => setSelectedCategory(route)}
        >
          <Text
            style={[
              styles.chipText,
              selectedCategory === route && styles.chipTextActive,
            ]}
          >
            {routeDisplayNames[route]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderGenreSelector = () => {
    // Calculate chip width for grid layout
    const getChipWidth = () => {
      const padding = 12;
      const gap = 8;
      const availableWidth = width - (padding * 2);
      const totalGap = gap * (genreGridColumns - 1);
      return (availableWidth - totalGap) / genreGridColumns;
    };

    const chipWidth = showFilters ? getChipWidth() : undefined;

    return (
      <View style={styles.genreContainer}>
        <ScrollView
          horizontal={!showFilters}
          showsVerticalScrollIndicator={showFilters && Platform.OS !== 'web'}
          showsHorizontalScrollIndicator={!showFilters && Platform.OS !== 'web'}
          style={!showFilters ? [styles.selectorScroll, styles.horizontalScroll] : styles.genreScrollExpanded}
          contentContainerStyle={showFilters ? styles.genreGrid : styles.selectorContent}
          nestedScrollEnabled={true}
        >
          {genres.map((genre, index) => {
            const isLastInRow = showFilters && (index + 1) % genreGridColumns === 0;
            return (
              <TouchableOpacity
                key={genre}
                style={[
                  styles.chip,
                  selectedGenre === genre && styles.chipActive,
                  showFilters && styles.chipGrid,
                  showFilters && chipWidth && { width: chipWidth },
                  showFilters && !isLastInRow && { marginRight: 8 },
                ]}
                onPress={() => setSelectedGenre(genre)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedGenre === genre && styles.chipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {capitalizeGenre(genre)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#888"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderAZSelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={Platform.OS !== 'web'}
      style={[styles.selectorScroll, styles.horizontalScroll]}
      contentContainerStyle={styles.selectorContent}
    >
      {azList.map(letter => (
        <TouchableOpacity
          key={letter}
          style={[
            styles.azChip,
            selectedAZ === letter && styles.chipActive,
          ]}
          onPress={() => setSelectedAZ(letter)}
        >
          <Text
            style={[
              styles.azText,
              selectedAZ === letter && styles.chipTextActive,
            ]}
          >
            {letter.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topSection}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Browse</Text>
          <Text style={styles.headerSubtitle}>{getCurrentTitle()}</Text>
        </View>

        {renderModeSelector()}

        {browseMode === 'category' && renderCategorySelector()}
        {browseMode === 'genre' && renderGenreSelector()}
        {browseMode === 'az' && renderAZSelector()}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : animeList.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No anime found</Text>
        </View>
      ) : (
        <FlatList
          data={animeList}
          renderItem={renderAnimeItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={`grid-${numColumns}`}
          contentContainerStyle={[
            styles.animeGrid,
            { padding: gridPadding }
          ]}
          columnWrapperStyle={numColumns > 1 ? styles.animeRow : undefined}
          style={styles.listContainer}
          showsVerticalScrollIndicator={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topSection: {
    flexShrink: 0,
    flexGrow: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e50914',
    marginTop: 4,
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
    flexShrink: 0,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#111',
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#e50914',
  },
  modeText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#fff',
  },
  selectorScroll: {
    marginBottom: 8,
    flexShrink: 0,
    height: 44,
  },
  horizontalScroll: {
    flexGrow: 0,
    ...Platform.select({
      web: {
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin',
      } as any,
      default: {},
    }),
  },
  selectorContent: {
    paddingHorizontal: 12,
    paddingRight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  genreContainer: {
    marginBottom: 8,
    flexShrink: 0,
  },
  genreScrollExpanded: {
    maxHeight: 300,
    marginBottom: 8,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#222',
    marginRight: 8,
  },
  chipGrid: {
    marginRight: 0,
    marginBottom: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  chipActive: {
    backgroundColor: '#e50914',
  },
  chipText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  azChip: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  azText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  expandButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  animeGrid: {
    paddingBottom: 20,
  },
  animeRow: {
    justifyContent: 'flex-start',
  },
  animeItem: {
    marginBottom: 12,
    backgroundColor: 'transparent',
    borderRadius: 4,
    overflow: 'hidden',
  },
  animePoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  animeInfo: {
    padding: 8,
  },
  animeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  animeType: {
    fontSize: 12,
    color: '#888',
  },
  animeRating: {
    fontSize: 12,
    color: '#ffc107',
    marginTop: 2,
  },
});
