import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { animeApi, Anime } from '@/services/api';
import { exploreRoutes, routeDisplayNames, ExploreRoute } from '@/data/meta';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BANNER_HEIGHT = Platform.OS === 'web' ? Math.min(SCREEN_HEIGHT * 0.7, 600) : 350;

// Featured categories for homepage
const homeCategories: ExploreRoute[] = [
  'top-airing',
  'most-popular',
  'recently-updated',
  'most-favorite',
  'movie',
];

interface CategoryData {
  route: ExploreRoute;
  title: string;
  anime: Anime[];
  loading: boolean;
  error: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const carouselRef = useRef<FlatList>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [spotlightAnime, setSpotlightAnime] = useState<Anime[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>(
    homeCategories.map(route => ({
      route,
      title: routeDisplayNames[route],
      anime: [],
      loading: true,
      error: null,
    }))
  );

  useEffect(() => {
    loadAllCategories();
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    if (spotlightAnime.length === 0) return;

    const interval = setInterval(() => {
      const nextIndex = (currentBannerIndex + 1) % spotlightAnime.length;
      setCurrentBannerIndex(nextIndex);
      carouselRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentBannerIndex, spotlightAnime.length]);

  const loadAllCategories = async () => {
    // Load all categories in parallel
    const promises = homeCategories.map(async (route, index) => {
      try {
        const data = await animeApi.getByCategory(route);

        // Use top-airing for spotlight
        if (route === 'top-airing' && data.length > 0) {
          setSpotlightAnime(data.slice(0, 5));
        }

        setCategories(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            anime: data.slice(0, 15),
            loading: false,
            error: null,
          };
          return updated;
        });
      } catch (err: any) {
        console.error(`Failed to load ${route}:`, err);
        setCategories(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            loading: false,
            error: 'Failed to load',
          };
          return updated;
        });
      }
    });

    await Promise.allSettled(promises);
  };

  const handleAnimePress = (anime: Anime) => {
    router.push(`/detail/${anime.id}`);
  };

  const handleSeeAll = (route: ExploreRoute) => {
    router.push(`/(tabs)/browse?category=${route}`);
  };

  const onBannerScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slideIndex !== currentBannerIndex && slideIndex >= 0 && slideIndex < spotlightAnime.length) {
      setCurrentBannerIndex(slideIndex);
    }
  }, [currentBannerIndex, spotlightAnime.length]);

  const renderBannerItem = ({ item }: { item: Anime }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleAnimePress(item)}
      style={styles.bannerSlide}
    >
      <Image
        source={{ uri: item.poster }}
        style={styles.bannerImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)', '#000']}
        style={styles.bannerGradient}
      />
      <View style={styles.bannerContent}>
        <View style={styles.bannerBadge}>
          <Ionicons name="flame" size={14} color="#fff" />
          <Text style={styles.bannerBadgeText}>TOP AIRING</Text>
        </View>
        <Text style={styles.bannerTitle} numberOfLines={2}>{item.name}</Text>
        <View style={styles.bannerMeta}>
          {item.type && <Text style={styles.bannerType}>{item.type}</Text>}
          {item.rating && (
            <View style={styles.bannerRating}>
              <Ionicons name="star" size={14} color="#ffc107" />
              <Text style={styles.bannerRatingText}>{item.rating}</Text>
            </View>
          )}
        </View>
        <View style={styles.bannerButtons}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => handleAnimePress(item)}
          >
            <Ionicons name="play" size={20} color="#000" />
            <Text style={styles.playButtonText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => handleAnimePress(item)}
          >
            <Ionicons name="information-circle-outline" size={20} color="#fff" />
            <Text style={styles.infoButtonText}>More Info</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {spotlightAnime.map((_, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => {
            setCurrentBannerIndex(index);
            carouselRef.current?.scrollToIndex({ index, animated: true });
          }}
        >
          <View
            style={[
              styles.dot,
              currentBannerIndex === index && styles.dotActive,
            ]}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAnimeCard = ({ item }: { item: Anime }) => (
    <TouchableOpacity
      style={styles.animeCard}
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
        {item.rating && (
          <Text style={styles.animeRating}>★ {item.rating}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCategory = (category: CategoryData) => {
    if (category.loading) {
      return (
        <View key={category.route} style={styles.section}>
          <Text style={styles.sectionTitle}>{category.title}</Text>
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color="#e50914" />
          </View>
        </View>
      );
    }

    if (category.error || category.anime.length === 0) {
      return null;
    }

    return (
      <View key={category.route} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{category.title}</Text>
          <TouchableOpacity onPress={() => handleSeeAll(category.route)}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={category.anime}
          renderItem={renderAnimeCard}
          keyExtractor={(item) => `${category.route}-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={Platform.OS !== 'web'}
          contentContainerStyle={styles.animeList}
          style={styles.horizontalList}
        />
      </View>
    );
  };

  const allLoading = categories.every(c => c.loading);

  if (allLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} stickyHeaderIndices={[]}>
        {/* Hero Carousel Banner */}
        {spotlightAnime.length > 0 && (
          <View style={styles.bannerContainer}>
            <FlatList
              ref={carouselRef}
              data={spotlightAnime}
              renderItem={renderBannerItem}
              keyExtractor={(item) => `banner-${item.id}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onBannerScroll}
              style={styles.horizontalList}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
            />
            {renderDots()}
          </View>
        )}

        {/* Category Sections - Netflix style overlap */}
        <View style={styles.categoriesContainer}>
          {categories.map(renderCategory)}
        </View>

        {/* Footer spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  // Banner styles
  bannerContainer: {
    height: BANNER_HEIGHT,
    position: 'relative',
  },
  bannerSlide: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  bannerContent: {
    position: 'absolute',
    left: Platform.OS === 'web' ? 48 : 16,
    right: Platform.OS === 'web' ? 48 : 16,
    bottom: Platform.OS === 'web' ? 100 : 60,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  bannerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerTitle: {
    fontSize: Platform.OS === 'web' ? 42 : 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
  },
  bannerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bannerType: {
    color: '#ccc',
    fontSize: 14,
  },
  bannerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerRatingText: {
    color: '#ffc107',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 8,
    borderRadius: 4,
    gap: 8,
  },
  playButtonText: {
    color: '#000',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 109, 110, 0.7)',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 8,
    borderRadius: 4,
    gap: 8,
  },
  infoButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#e50914',
    width: 24,
  },
  // Categories container - overlaps hero slightly for Netflix effect
  categoriesContainer: {
    marginTop: Platform.OS === 'web' ? -60 : -30,
    position: 'relative',
    zIndex: 1,
  },
  // Quick categories (keeping for potential future use)
  quickCategories: {
    marginBottom: 16,
  },
  quickCategoriesContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickCategoryChip: {
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  quickCategoryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  // Section styles
  section: {
    marginBottom: Platform.OS === 'web' ? 32 : 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 48 : 16,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 18,
    fontWeight: '700',
    color: '#fff',
  },
  seeAllText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  loadingSection: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animeList: {
    paddingHorizontal: Platform.OS === 'web' ? 42 : 10,
  },
  horizontalList: {
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
  animeCard: {
    width: Platform.OS === 'web' ? 180 : 130,
    marginHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        transition: 'transform 0.2s ease',
        cursor: 'pointer',
      } as any,
      default: {},
    }),
  },
  animePoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  animeInfo: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  animeTitle: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontWeight: '500',
    color: '#e5e5e5',
    marginBottom: 2,
  },
  animeType: {
    fontSize: 11,
    color: '#777',
  },
  animeRating: {
    fontSize: 11,
    color: '#46d369',
    marginTop: 2,
  },
});
