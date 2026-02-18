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
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { animeApi, Anime } from '@/services/api';
import { exploreRoutes, routeDisplayNames, ExploreRoute } from '@/data/meta';
import { newsService, NewsItem } from '@/services/newsService';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { watchHistoryService, WatchHistoryEntry } from '@/services/watchHistoryService';

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
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentlyWatched, setRecentlyWatched] = useState<WatchHistoryEntry[]>([]);

  // Clean up Expo Router internal params from URL on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const cleanUrl = () => {
        const url = new URL(window.location.href);
        if (url.searchParams.has('__EXPO_ROUTER_key')) {
          url.searchParams.delete('__EXPO_ROUTER_key');
          window.history.replaceState({}, '', url.toString());
        }
      };
      cleanUrl();
      const timeout = setTimeout(cleanUrl, 100);
      return () => clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    loadAllCategories();
    loadNews();
    loadRecentlyWatched();
  }, []);

  const loadRecentlyWatched = async () => {
    try {
      const history = await watchHistoryService.getRecentlyWatched(10);
      setRecentlyWatched(history);
    } catch (err) {
      console.error('Failed to load recently watched:', err);
    }
  };

  const loadNews = async () => {
    try {
      setLoadingNews(true);
      const newsData = await newsService.getNews(5);
      setNews(newsData);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoadingNews(false);
    }
  };

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset categories to loading state
    setCategories(
      homeCategories.map(route => ({
        route,
        title: routeDisplayNames[route],
        anime: [],
        loading: true,
        error: null,
      }))
    );
    await Promise.all([loadAllCategories(), loadNews()]);
    setRefreshing(false);
  }, []);

  const handleAnimePress = (anime: Anime) => {
    router.push({
      pathname: '/detail/[id]',
      params: { id: anime.id },
    });
  };

  const handleSeeAll = (route: ExploreRoute) => {
    router.push({
      pathname: '/(tabs)/browse',
      params: { category: route },
    });
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
        source={{ uri: getProxiedImageUrl(item.poster) || '' }}
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
        source={{ uri: getProxiedImageUrl(item.poster) || '' }}
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

  const getNewsIcon = (type: NewsItem['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'new_episode': return 'play-circle';
      case 'new_season': return 'calendar';
      case 'announcement': return 'megaphone';
      default: return 'newspaper';
    }
  };

  const getNewsColor = (type: NewsItem['type']): string => {
    switch (type) {
      case 'new_episode': return '#46d369';
      case 'new_season': return '#e50914';
      case 'announcement': return '#ffc107';
      default: return '#888';
    }
  };

  const renderNewsItem = ({ item }: { item: NewsItem }) => (
    <View style={styles.newsCard}>
      <View style={[styles.newsIconContainer, { backgroundColor: getNewsColor(item.type) + '22' }]}>
        <Ionicons name={getNewsIcon(item.type)} size={20} color={getNewsColor(item.type)} />
      </View>
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.newsSummary} numberOfLines={2}>{item.summary}</Text>
        <View style={styles.newsMeta}>
          {item.animeName && <Text style={styles.newsAnimeName}>{item.animeName}</Text>}
          <Text style={styles.newsTime}>{newsService.formatTimeAgo(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );

  const renderNewsSection = () => {
    if (loadingNews) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest News</Text>
          </View>
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color="#e50914" />
          </View>
        </View>
      );
    }

    if (news.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest News</Text>
        </View>
        <View style={styles.newsList}>
          {news.map((item) => (
            <View key={item.id}>
              {renderNewsItem({ item })}
            </View>
          ))}
        </View>
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        stickyHeaderIndices={[]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#e50914"
            colors={['#e50914']}
          />
        }
      >
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

        {/* Continue Watching Section */}
        {recentlyWatched.length > 0 && (
          <View style={styles.continueWatchingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Continue Watching</Text>
            </View>
            <FlatList
              data={recentlyWatched}
              renderItem={({ item: entry }) => (
                <TouchableOpacity
                  style={styles.continueWatchingCard}
                  onPress={() => router.push({
                    pathname: '/watch/[id]',
                    params: { id: entry.animeId, ep: entry.episodeNumber },
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.continueWatchingPosterContainer}>
                    <Image
                      source={{ uri: getProxiedImageUrl(entry.animePoster || '') || '' }}
                      style={styles.continueWatchingPoster}
                      resizeMode="cover"
                    />
                    <View style={styles.continueWatchingPlayOverlay}>
                      <View style={styles.continueWatchingPlayButton}>
                        <Ionicons name="play" size={20} color="#fff" />
                      </View>
                    </View>
                    <View style={styles.continueWatchingProgress}>
                      <View
                        style={[
                          styles.continueWatchingProgressBar,
                          { width: `${Math.min(95, (entry.timestamp / (entry.duration || 1400)) * 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.continueWatchingInfo}>
                    <Text style={styles.continueWatchingTitle} numberOfLines={1}>
                      {entry.animeName}
                    </Text>
                    <Text style={styles.continueWatchingEpisode}>
                      Ep {entry.episodeNumber} • {watchHistoryService.formatTime(entry.timestamp)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => `continue-${item.animeId}-${item.episodeNumber}`}
              horizontal
              showsHorizontalScrollIndicator={Platform.OS !== 'web'}
              contentContainerStyle={styles.animeList}
              style={styles.horizontalList}
            />
          </View>
        )}

        {/* Category Sections - Netflix style overlap */}
        <View style={styles.categoriesContainer}>
          {categories.map(renderCategory)}
        </View>

        {/* News Section */}
        {renderNewsSection()}

        {/* Footer spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Header with Gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.6)', 'transparent']}
        style={styles.floatingHeader}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.appHeader}>
            <Image
              source={require('../../assets/logo-w-text.png')}
              style={styles.appLogo}
              resizeMode="contain"
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
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
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerSafeArea: {
    width: '100%',
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 48 : 12,
    paddingVertical: Platform.OS === 'web' ? 16 : 8,
  },
  appLogo: {
    width: Platform.OS === 'web' ? 160 : 140,
    height: Platform.OS === 'web' ? 48 : 40,
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
    left: Platform.OS === 'web' ? 48 : 12,
    right: Platform.OS === 'web' ? 48 : 12,
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
    paddingHorizontal: Platform.OS === 'web' ? 48 : 12,
    marginBottom: Platform.OS === 'web' ? 16 : 10,
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
    paddingHorizontal: Platform.OS === 'web' ? 42 : 6,
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
  // News styles
  newsList: {
    paddingHorizontal: Platform.OS === 'web' ? 48 : 12,
    gap: 12,
  },
  newsCard: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  newsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  newsSummary: {
    color: '#888',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newsAnimeName: {
    color: '#e50914',
    fontSize: 11,
    fontWeight: '500',
  },
  newsTime: {
    color: '#666',
    fontSize: 11,
  },
  // Continue Watching Styles
  continueWatchingSection: {
    marginTop: Platform.OS === 'web' ? -40 : -20,
    marginBottom: Platform.OS === 'web' ? 16 : 8,
    position: 'relative',
    zIndex: 2,
  },
  continueWatchingCard: {
    width: Platform.OS === 'web' ? 200 : 150,
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  continueWatchingPosterContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  continueWatchingPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  continueWatchingPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  continueWatchingPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  continueWatchingProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
  },
  continueWatchingProgressBar: {
    height: '100%',
    backgroundColor: '#e50914',
  },
  continueWatchingInfo: {
    padding: 8,
  },
  continueWatchingTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  continueWatchingEpisode: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
});
