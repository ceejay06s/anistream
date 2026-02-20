import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { savedAnimeService, SavedAnime, CollectionStatus, COLLECTION_LABELS } from '@/services/savedAnimeService';
import { getProxiedImageUrl } from '@/utils/imageProxy';

const COLLECTION_ICONS: Record<CollectionStatus, keyof typeof Ionicons.glyphMap> = {
  watching: 'play-circle',
  plan_to_watch: 'time',
  completed: 'checkmark-circle',
  on_hold: 'pause-circle',
  dropped: 'close-circle',
};

const COLLECTION_TABS: CollectionStatus[] = ['watching', 'plan_to_watch', 'completed', 'on_hold', 'dropped'];

export default function WatchlistScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [savedAnime, setSavedAnime] = useState<SavedAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [collectionTab, setCollectionTab] = useState<CollectionStatus>('watching');

  useEffect(() => {
    if (user) {
      loadSavedAnime();
    }
  }, [user]);

  const loadSavedAnime = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const anime = await savedAnimeService.getSavedAnime(user.uid);
      setSavedAnime(anime);
    } catch (err) {
      console.error('Failed to load saved anime:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedAnime();
    setRefreshing(false);
  }, [user]);

  const handleRemoveAnime = async (animeId: string) => {
    if (!user) return;
    try {
      await savedAnimeService.unsaveAnime(user.uid, animeId);
      setSavedAnime(prev => prev.filter(a => a.id !== animeId));
    } catch (err) {
      console.error('Failed to remove anime:', err);
    }
  };

  const handleUpdateStatus = async (animeId: string, newStatus: CollectionStatus) => {
    if (!user) return;
    try {
      await savedAnimeService.updateAnimeStatus(user.uid, animeId, newStatus);
      setSavedAnime(prev =>
        prev.map(a => (a.id === animeId ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredAnime = savedAnime.filter(a => a.status === collectionTab);

  const renderAnimeItem = ({ item }: { item: SavedAnime }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.animeCard}
      onPress={() => router.push(`/detail/${item.id}`)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getProxiedImageUrl(item.poster) || undefined }}
        style={styles.animePoster}
        resizeMode="cover"
      />
      <View style={styles.animeInfo}>
        <Text style={styles.animeTitle} numberOfLines={2}>
          {item.name}
        </Text>
        {item.currentEpisode && (
          <Text style={styles.episodeText}>
            Episode {item.currentEpisode}
          </Text>
        )}
        <View style={styles.statusBadge}>
          <Ionicons
            name={COLLECTION_ICONS[item.status]}
            size={12}
            color="#e50914"
          />
          <Text style={styles.statusText}>{COLLECTION_LABELS[item.status]}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveAnime(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Not logged in state
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Watch List</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>Sign in to access your Watch List</Text>
          <Text style={styles.emptySubtitle}>
            Save anime to track what you're watching
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Watch List</Text>
      </View>

      {/* Collection Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          data={COLLECTION_TABS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => {
            const count = savedAnime.filter(a => a.status === item).length;
            const isActive = collectionTab === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setCollectionTab(item)}
              >
                <Ionicons
                  name={COLLECTION_ICONS[item]}
                  size={16}
                  color={isActive ? '#e50914' : '#888'}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {COLLECTION_LABELS[item]}
                </Text>
                {count > 0 && (
                  <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                    <Text style={[styles.countText, isActive && styles.countTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : filteredAnime.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name={COLLECTION_ICONS[collectionTab]} size={64} color="#333" />
          <Text style={styles.emptyTitle}>No anime in {COLLECTION_LABELS[collectionTab]}</Text>
          <Text style={styles.emptySubtitle}>
            Add anime from the detail page to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAnime}
          keyExtractor={(item) => item.id}
          renderItem={renderAnimeItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e50914"
              colors={['#e50914']}
            />
          }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    marginRight: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
  },
  tabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#e50914',
  },
  countBadge: {
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: '#e50914',
  },
  countText: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  countTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  animeCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  animePoster: {
    width: 80,
    height: 120,
    backgroundColor: '#333',
  },
  animeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  animeTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    color: '#e50914',
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
