import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  Pressable,
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
import { useAuth } from '@/context/AuthContext';
import { getCached } from '@/utils/apiCache';
import { userNotificationService } from '@/services/userNotificationService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BANNER_HEIGHT = Platform.OS === 'web' ? Math.min(SCREEN_HEIGHT * 0.7, 600) : 350;

// Gradient color arrays defined outside component to prevent recreation on every render
const BANNER_GRADIENT_COLORS = ['transparent', 'rgba(0,0,0,0.8)', '#000'] as const;
const HEADER_GRADIENT_COLORS = ['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.6)', 'transparent'] as const;
const CARD_OVERLAY_GRADIENT = ['transparent', 'rgba(0,0,0,0.9)'] as const;
const CONTINUE_WATCHING_GRADIENT = ['transparent', 'rgba(0,0,0,0.9)'] as const;

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
  const { user } = useAuth();
  const carouselRef = useRef<FlatList>(null);
  const bannerIndexRef = useRef(0);
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Subscribe to unread notification count
  useEffect(() => {
    if (!user) return;
    const unsubscribe = userNotificationService.subscribeToUnreadCount(
      user.uid,
      setUnreadNotifications
    );
    return () => unsubscribe();
  }, [user]);

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
      const newsData = await getCached('news:latest', () => newsService.getNews(5));
      setNews(newsData);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoadingNews(false);
    }
  };

  // Auto-scroll carousel — uses ref to avoid recreating interval every 5s
  useEffect(() => {
    if (spotlightAnime.length <= 1) return;

    const interval = setInterval(() => {
      const next = (bannerIndexRef.current + 1) % spotlightAnime.length;
      bannerIndexRef.current = next;
      setCurrentBannerIndex(next);
      carouselRef.current?.scrollToIndex({ index: next, animated: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [spotlightAnime.length]);

  const loadAllCategories = async () => {
    // Fire all requests in parallel with caching, then update state in one batch
    const results = await Promise.allSettled(
      homeCategories.map(route => getCached(`category:${route}`, () => animeApi.getByCategory(route)))
    );

    let spotlightData: Anime[] = [];
    setCategories(prev => {
      const updated = [...prev];
      results.forEach((result, index) => {
        const route = homeCategories[index];
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (route === 'top-airing' && data.length > 0) {
            spotlightData = data.slice(0, 5);
          }
          updated[index] = { ...updated[index], anime: data.slice(0, 15), loading: false, error: null };
        } else {
          console.error(`Failed to load ${route}:`, result.reason);
          updated[index] = { ...updated[index], loading: false, error: 'Failed to load' };
        }
      });
      return updated;
    });

    if (spotlightData.length > 0) {
      setSpotlightAnime(spotlightData);
    }
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

  const handleAnimePress = useCallback((anime: Anime) => {
    router.push({
      pathname: '/detail/[id]',
      params: { id: anime.id },
    });
  }, [router]);

  const handleSeeAll = useCallback((route: ExploreRoute) => {
    router.push({
      pathname: '/(tabs)/browse',
      params: { category: route },
    });
  }, [router]);

  const onBannerScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slideIndex !== bannerIndexRef.current && slideIndex >= 0 && slideIndex < spotlightAnime.length) {
      bannerIndexRef.current = slideIndex;
      setCurrentBannerIndex(slideIndex);
    }
  }, [spotlightAnime.length]);

  const renderBannerItem = useCallback(({ item }: { item: Anime }) => (
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
        colors={BANNER_GRADIENT_COLORS}
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
  ), [handleAnimePress]);

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {spotlightAnime.map((_, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => {
            bannerIndexRef.current = index;
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

  const renderAnimeCard = useCallback(({ item }: { item: Anime }) => (
    <Pressable
      style={({ pressed, hovered }: any) => [
        styles.animeCard,
        (hovered || pressed) && styles.animeCardHovered,
      ]}
      onPress={() => handleAnimePress(item)}
    >
      {({ pressed, hovered }: any) => (
        <>
          <Image
            source={{ uri: getProxiedImageUrl(item.poster) || '' }}
            style={styles.animePoster}
            resizeMode="cover"
          />
          {(hovered || pressed) && (
            <LinearGradient
              colors={CARD_OVERLAY_GRADIENT}
              style={styles.animeCardOverlay}
            >
              <Text style={styles.animeCardTitle} numberOfLines={2}>
                {item.name}
              </Text>
            </LinearGradient>
          )}
        </>
      )}
    </Pressable>
  ), [handleAnimePress]);

  const renderCategory = useCallback((category: CategoryData) => {
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
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={4}
        />
      </View>
    );
  }, [renderAnimeCard, handleSeeAll]);

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

  const renderNewsItem = useCallback(({ item }: { item: NewsItem }) => (
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
  ), []);

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
        <FlatList
          data={news}
          renderItem={renderNewsItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.newsList}
        />
      </View>
    );
  };

  const renderContinueWatchingItem = useCallback(({ item: entry }: { item: WatchHistoryEntry }) => (
    <TouchableOpacity
      key={`continue-${entry.animeId}-${entry.episodeNumber}`}
      style={styles.continueWatchingCard}
      onPress={() => router.push({
        pathname: '/watch/[id]',
        params: { id: entry.animeId, ep: entry.episodeNumber },
      })}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: getProxiedImageUrl(entry.animePoster || '') || '' }}
        style={styles.continueWatchingPoster}
        resizeMode="cover"
      />
      <LinearGradient
        colors={CONTINUE_WATCHING_GRADIENT}
        style={styles.continueWatchingGradient}
      />
      <View style={styles.continueWatchingOverlay}>
        <View style={styles.continueWatchingPlayIcon}>
          <Ionicons name="play-circle" size={32} color="#fff" />
        </View>
        <View style={styles.continueWatchingTextOverlay}>
          <Text style={styles.continueWatchingTitle} numberOfLines={1}>
            {entry.animeName}
          </Text>
          <Text style={styles.continueWatchingEpisode}>
            E{entry.episodeNumber} · {watchHistoryService.formatTime(entry.timestamp)} left
          </Text>
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
    </TouchableOpacity>
  ), [router]);

  const allLoading = useMemo(() => categories.every(c => c.loading), [categories]);

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
              removeClippedSubviews={false}
              maxToRenderPerBatch={3}
              windowSize={3}
              initialNumToRender={1}
            />
            {renderDots()}
          </View>
        )}

        {/* Continue Watching Section - Netflix Style */}
        {recentlyWatched.length > 0 && (
          <View style={styles.continueWatchingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Continue Watching</Text>
            </View>
            <FlatList
              data={recentlyWatched}
              renderItem={renderContinueWatchingItem}
              keyExtractor={(entry) => `continue-${entry.animeId}-${entry.episodeNumber}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.continueWatchingListContent}
              removeClippedSubviews={true}
              maxToRenderPerBatch={4}
              initialNumToRender={3}
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
        colors={HEADER_GRADIENT_COLORS}
        style={styles.floatingHeader}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.appHeader}>
            <Image
              source={require('../../assets/logo-w-text.png')}
              style={styles.appLogo}
              resizeMode="contain"
            />
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Ionicons name="search" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push('/(tabs)/notifications')}
              >
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerAvatarButton}
                onPress={() => router.push('/(tabs)/profile')}
              >
                {user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.headerAvatar} />
                ) : user ? (
                  <View style={styles.headerAvatarPlaceholder}>
                    <Ionicons name="person" size={16} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.headerLoginButton}>
                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    paddingLeft: 40,
    paddingRight: Platform.OS === 'web' ? 48 : 12,
    paddingVertical: Platform.OS === 'web' ? 16 : 8,
  },
  appLogo: {
    width: Platform.OS === 'web' ? 160 : 140,
    height: Platform.OS === 'web' ? 48 : 40,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  headerAvatarButton: {
    padding: 4,
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  headerAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    borderWidth: 1.5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLoginButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
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
  // Categories container
  categoriesContainer: {
    marginTop: Platform.OS === 'web' ? -60 : 0,
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
    marginBottom: Platform.OS === 'web' ? 32 : 28,
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
    width: Platform.OS === 'web' ? 150 : 105,
    marginHorizontal: Platform.OS === 'web' ? 4 : 3,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        transition: 'transform 0.2s ease',
        cursor: 'pointer',
      } as any,
      default: {},
    }),
  },
  animeCardHovered: {
    transform: [{ scale: 1.04 }],
    zIndex: 10,
  },
  animePoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
  },
  animeCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 8,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  animeCardTitle: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 12 : 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  // Continue Watching Styles - Netflix Style
  continueWatchingSection: {
    marginTop: 40,
    marginBottom: 80,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  continueWatchingListContent: {
    paddingHorizontal: Platform.OS === 'web' ? 42 : 8,
    gap: 10,
  },
  continueWatchingCard: {
    width: Platform.OS === 'web' ? 280 : 200,
    aspectRatio: 16 / 9,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  continueWatchingPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  continueWatchingGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  continueWatchingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueWatchingPlayIcon: {
    opacity: 0.9,
  },
  continueWatchingTextOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
  },
  continueWatchingProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(80, 80, 80, 0.8)',
  },
  continueWatchingProgressBar: {
    height: '100%',
    backgroundColor: '#e50914',
  },
  continueWatchingTitle: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  continueWatchingEpisode: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
