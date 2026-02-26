import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { animeApi, AnimeInfo, Episode, VoiceActor, RelatedAnime } from '@/services/api';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { useAuth } from '@/context/AuthContext';
import { savedAnimeService, SavedAnime, CollectionStatus, COLLECTION_LABELS } from '@/services/savedAnimeService';

const COLLECTION_ICONS: Record<CollectionStatus, keyof typeof Ionicons.glyphMap> = {
  watching: 'play-circle',
  plan_to_watch: 'time',
  completed: 'checkmark-circle',
  on_hold: 'pause-circle',
  dropped: 'close-circle',
};

const EPISODES_PER_PAGE = 50;

type TabType = 'synopsis' | 'cast' | 'studio' | 'suggestions';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('synopsis');

  // Save/bookmark state
  const [savedStatus, setSavedStatus] = useState<SavedAnime | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

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
      // Run immediately and after a delay to catch Expo Router's additions
      cleanUrl();
      const timeout = setTimeout(cleanUrl, 100);
      return () => clearTimeout(timeout);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadAnimeData();
    }
  }, [id]);

  // Check if anime is saved
  useEffect(() => {
    if (user && id) {
      checkSavedStatus();
    }
  }, [user, id]);

  const checkSavedStatus = async () => {
    if (!user || !id) return;
    try {
      const status = await savedAnimeService.getAnimeStatus(user.uid, id);
      setSavedStatus(status);
    } catch (err) {
      console.error('Failed to check saved status:', err);
    }
  };

  const handleSaveWithStatus = async (status: CollectionStatus) => {
    if (!user || !animeInfo) return;

    setSavingStatus(true);
    try {
      if (savedStatus) {
        // Update existing status
        await savedAnimeService.updateAnimeStatus(user.uid, animeInfo.id, status);
        setSavedStatus({ ...savedStatus, status });
      } else {
        // Save new anime
        await savedAnimeService.saveAnime(user.uid, {
          id: animeInfo.id,
          name: animeInfo.name,
          poster: animeInfo.poster,
          type: animeInfo.type,
        }, status);
        setSavedStatus({
          id: animeInfo.id,
          name: animeInfo.name,
          poster: animeInfo.poster,
          type: animeInfo.type,
          status,
          savedAt: Date.now(),
          notifyOnUpdate: true,
        });
      }
      setShowStatusModal(false);
    } catch (err) {
      console.error('Failed to save anime:', err);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleRemoveFromCollection = async () => {
    if (!user || !id) return;

    setSavingStatus(true);
    try {
      await savedAnimeService.unsaveAnime(user.uid, id);
      setSavedStatus(null);
      setShowStatusModal(false);
    } catch (err) {
      console.error('Failed to remove anime:', err);
    } finally {
      setSavingStatus(false);
    }
  };

  const loadAnimeData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [info, episodeList] = await Promise.all([
        animeApi.getInfo(id),
        animeApi.getEpisodes(id),
      ]);

      setAnimeInfo(info);
      setEpisodes(episodeList);
    } catch (err: any) {
      console.error('Failed to load anime data:', err);
      setError('Failed to load anime details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push({ pathname: '/(tabs)/home' });
    }
  };

  const handleEpisodePress = (episode: Episode) => {
    router.push({
      pathname: '/watch/[id]',
      params: {
        id: id as string,
        ep: String(episode.number),
        episodeId: episode.episodeId,
      },
    });
  };

  const handleAnimePress = (anime: RelatedAnime) => {
    router.push({
      pathname: '/detail/[id]',
      params: { id: anime.id },
    });
  };

  // Pagination logic
  const totalPages = useMemo(() =>
    Math.ceil(episodes.length / EPISODES_PER_PAGE),
    [episodes.length]
  );

  const needsPagination = episodes.length > EPISODES_PER_PAGE;

  const paginatedEpisodes = useMemo(() => {
    if (!needsPagination) return episodes;
    const start = currentPage * EPISODES_PER_PAGE;
    const end = start + EPISODES_PER_PAGE;
    return episodes.slice(start, end);
  }, [episodes, currentPage, needsPagination]);

  const pageRanges = useMemo(() => {
    if (!needsPagination) return [];
    return Array.from({ length: totalPages }, (_, i) => {
      const start = i * EPISODES_PER_PAGE + 1;
      const end = Math.min((i + 1) * EPISODES_PER_PAGE, episodes.length);
      return { page: i, label: `${start}-${end}` };
    });
  }, [totalPages, episodes.length, needsPagination]);

  // Tab content renderers
  const renderSynopsisTab = () => (
    <View style={styles.tabContent}>
      {animeInfo?.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synopsis</Text>
          <Text style={styles.description}>{animeInfo.description}</Text>
        </View>
      )}

      {/* Anime Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailsGrid}>
          {animeInfo?.japanese && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Japanese</Text>
              <Text style={styles.detailValue}>{animeInfo.japanese}</Text>
            </View>
          )}
          {animeInfo?.status && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{animeInfo.status}</Text>
            </View>
          )}
          {animeInfo?.aired && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Aired</Text>
              <Text style={styles.detailValue}>{animeInfo.aired}</Text>
            </View>
          )}
          {animeInfo?.premiered && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Premiered</Text>
              <Text style={styles.detailValue}>{animeInfo.premiered}</Text>
            </View>
          )}
          {animeInfo?.duration && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{animeInfo.duration}</Text>
            </View>
          )}
          {animeInfo?.type && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{animeInfo.type}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderCastTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Actors</Text>
        {animeInfo?.characters && animeInfo.characters.length > 0 ? (
          <View style={styles.castGrid}>
            {animeInfo.characters.map((cv, index) => (
              <View key={`${cv.character.id || cv.character.name || 'character'}-${index}`} style={styles.castItem}>
                <View style={styles.castRow}>
                  {/* Character */}
                  <View style={styles.castPerson}>
                    <Image
                      source={{ uri: getProxiedImageUrl(cv.character.poster) || 'https://via.placeholder.com/60' }}
                      style={styles.castImage}
                    />
                    <Text style={styles.castName} numberOfLines={2}>
                      {cv.character.name || 'Unknown Character'}
                    </Text>
                    <Text style={styles.castRole}>Character</Text>
                  </View>

                  {/* Connector */}
                  <View style={styles.castConnector}>
                    <Ionicons name="arrow-forward" size={16} color="#666" />
                  </View>

                  {/* Voice Actor */}
                  <View style={styles.castPerson}>
                    <Image
                      source={{ uri: getProxiedImageUrl(cv.voiceActor.poster) || 'https://via.placeholder.com/60' }}
                      style={styles.castImage}
                    />
                    <Text style={styles.castName} numberOfLines={2}>
                      {cv.voiceActor.name || 'Unknown Voice Actor'}
                    </Text>
                    <Text style={styles.castRole}>Voice Actor</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No voice actor information available</Text>
        )}
      </View>
    </View>
  );

  const renderStudioTab = () => (
    <View style={styles.tabContent}>
      {/* Studios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Studios</Text>
        {animeInfo?.studios && animeInfo.studios.length > 0 ? (
          <View style={styles.studioList}>
            {animeInfo.studios.map((studio, index) => (
              <View key={index} style={styles.studioChip}>
                <Ionicons name="business-outline" size={16} color="#e50914" />
                <Text style={styles.studioName}>{studio.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No studio information available</Text>
        )}
      </View>

      {/* Producers */}
      {animeInfo?.producers && animeInfo.producers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Producers</Text>
          <View style={styles.producerList}>
            {animeInfo.producers.map((producer, index) => (
              <View key={index} style={styles.producerChip}>
                <Text style={styles.producerName}>{producer}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderSuggestionsTab = () => (
    <View style={styles.tabContent}>
      {/* Seasons */}
      {animeInfo?.seasons && animeInfo.seasons.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seasons</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS !== 'web'} style={styles.horizontalScroll}>
            <View style={styles.animeRow}>
              {animeInfo.seasons.map((anime, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.animeCard}
                  onPress={() => handleAnimePress(anime)}
                >
                  <Image
                    source={{ uri: getProxiedImageUrl(anime.poster) || '' }}
                    style={styles.animeCardImage}
                  />
                  <Text style={styles.animeCardTitle} numberOfLines={2}>
                    {anime.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Related Anime */}
      {animeInfo?.relatedAnime && animeInfo.relatedAnime.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Related Anime</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS !== 'web'} style={styles.horizontalScroll}>
            <View style={styles.animeRow}>
              {animeInfo.relatedAnime.map((anime, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.animeCard}
                  onPress={() => handleAnimePress(anime)}
                >
                  <Image
                    source={{ uri: getProxiedImageUrl(anime.poster) || '' }}
                    style={styles.animeCardImage}
                  />
                  <Text style={styles.animeCardTitle} numberOfLines={2}>
                    {anime.name}
                  </Text>
                  {anime.type && (
                    <Text style={styles.animeCardType}>{anime.type}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Recommendations */}
      {animeInfo?.recommendedAnime && animeInfo.recommendedAnime.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS !== 'web'} style={styles.horizontalScroll}>
            <View style={styles.animeRow}>
              {animeInfo.recommendedAnime.map((anime, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.animeCard}
                  onPress={() => handleAnimePress(anime)}
                >
                  <Image
                    source={{ uri: getProxiedImageUrl(anime.poster) || '' }}
                    style={styles.animeCardImage}
                  />
                  <Text style={styles.animeCardTitle} numberOfLines={2}>
                    {anime.name}
                  </Text>
                  {anime.type && (
                    <Text style={styles.animeCardType}>{anime.type}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Empty state */}
      {(!animeInfo?.relatedAnime || animeInfo.relatedAnime.length === 0) &&
       (!animeInfo?.recommendedAnime || animeInfo.recommendedAnime.length === 0) &&
       (!animeInfo?.seasons || animeInfo.seasons.length === 0) && (
        <Text style={styles.emptyText}>No suggestions available</Text>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'synopsis':
        return renderSynopsisTab();
      case 'cast':
        return renderCastTab();
      case 'studio':
        return renderStudioTab();
      case 'suggestions':
        return renderSuggestionsTab();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !animeInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Anime not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAnimeData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Status Modal Component
  const StatusModal = () => (
    <Modal visible={showStatusModal} animationType="fade" transparent>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowStatusModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {savedStatus ? 'Change Status' : 'Add to Collection'}
          </Text>

          {(Object.keys(COLLECTION_LABELS) as CollectionStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                savedStatus?.status === status && styles.statusOptionActive,
              ]}
              onPress={() => handleSaveWithStatus(status)}
              disabled={savingStatus}
            >
              <Ionicons
                name={COLLECTION_ICONS[status]}
                size={20}
                color={savedStatus?.status === status ? '#e50914' : '#888'}
              />
              <Text
                style={[
                  styles.statusOptionText,
                  savedStatus?.status === status && styles.statusOptionTextActive,
                ]}
              >
                {COLLECTION_LABELS[status]}
              </Text>
              {savedStatus?.status === status && (
                <Ionicons name="checkmark" size={20} color="#e50914" style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}

          {savedStatus && (
            <TouchableOpacity
              style={styles.removeOption}
              onPress={handleRemoveFromCollection}
              disabled={savingStatus}
            >
              <Ionicons name="trash-outline" size={20} color="#e50914" />
              <Text style={styles.removeOptionText}>Remove from Collection</Text>
            </TouchableOpacity>
          )}

          {savingStatus && (
            <ActivityIndicator size="small" color="#e50914" style={{ marginTop: 12 }} />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusModal />
      <ScrollView style={styles.scrollView}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: getProxiedImageUrl(animeInfo.poster) || '' }}
            style={styles.poster}
            resizeMode="cover"
          />
          <View style={styles.heroInfo}>
            <Text style={styles.title}>{animeInfo.name}</Text>
            {animeInfo.type && (
              <Text style={styles.type}>{animeInfo.type}</Text>
            )}
            {animeInfo.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#ffc107" />
                <Text style={styles.rating}>{animeInfo.rating}</Text>
              </View>
            )}

            {/* Save Button */}
            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  savedStatus && styles.saveButtonActive,
                ]}
                onPress={() => {
                  if (user) {
                    setShowStatusModal(true);
                  } else {
                    router.push('/(tabs)/profile');
                  }
                }}
              >
                <Ionicons
                  name={savedStatus ? COLLECTION_ICONS[savedStatus.status] : 'bookmark-outline'}
                  size={18}
                  color={savedStatus ? '#e50914' : '#fff'}
                />
                <Text style={[
                  styles.saveButtonText,
                  savedStatus && styles.saveButtonTextActive,
                ]}>
                  {savedStatus ? COLLECTION_LABELS[savedStatus.status] : 'Add to List'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Genres */}
        {animeInfo.genres && animeInfo.genres.length > 0 && (
          <View style={styles.genresContainer}>
            {animeInfo.genres.map((genre, index) => (
              <View key={index} style={styles.genreChip}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'synopsis' && styles.tabActive]}
            onPress={() => setActiveTab('synopsis')}
          >
            <Text style={[styles.tabText, activeTab === 'synopsis' && styles.tabTextActive]}>
              Synopsis
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'cast' && styles.tabActive]}
            onPress={() => setActiveTab('cast')}
          >
            <Text style={[styles.tabText, activeTab === 'cast' && styles.tabTextActive]}>
              Voice Actors
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'studio' && styles.tabActive]}
            onPress={() => setActiveTab('studio')}
          >
            <Text style={[styles.tabText, activeTab === 'studio' && styles.tabTextActive]}>
              Studio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'suggestions' && styles.tabActive]}
            onPress={() => setActiveTab('suggestions')}
          >
            <Text style={[styles.tabText, activeTab === 'suggestions' && styles.tabTextActive]}>
              Suggestions
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Episodes */}
        <View style={styles.episodesSection}>
          <Text style={styles.sectionTitle}>
            Episodes ({episodes.length})
          </Text>

          {/* Episode range selector for pagination */}
          {needsPagination && (
            <View style={styles.paginationContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={Platform.OS !== 'web'}
                contentContainerStyle={styles.paginationContent}
                style={styles.horizontalScroll}
              >
                {pageRanges.map(({ page, label }) => (
                  <TouchableOpacity
                    key={page}
                    style={[
                      styles.pageButton,
                      currentPage === page && styles.pageButtonActive,
                    ]}
                    onPress={() => setCurrentPage(page)}
                  >
                    <Text
                      style={[
                        styles.pageButtonText,
                        currentPage === page && styles.pageButtonTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {episodes.length > 0 ? (
            <View style={styles.episodesGrid}>
              {paginatedEpisodes.map((episode) => (
                <TouchableOpacity
                  key={episode.episodeId}
                  style={styles.episodeItem}
                  onPress={() => handleEpisodePress(episode)}
                >
                  <View style={styles.episodeNumber}>
                    <Text style={styles.episodeNumberText}>{episode.number}</Text>
                  </View>
                  <Text style={styles.episodeTitle} numberOfLines={1}>
                    {episode.title || `Episode ${episode.number}`}
                  </Text>
                  <Ionicons name="play-circle" size={24} color="#e50914" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noEpisodes}>No episodes available</Text>
          )}

          {/* Bottom pagination controls */}
          {needsPagination && (
            <View style={styles.paginationNav}>
              <TouchableOpacity
                style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
                onPress={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <Ionicons name="chevron-back" size={20} color={currentPage === 0 ? '#444' : '#fff'} />
                <Text style={[styles.navButtonText, currentPage === 0 && styles.navButtonTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageIndicator}>
                {currentPage + 1} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.navButton, currentPage === totalPages - 1 && styles.navButtonDisabled]}
                onPress={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <Text style={[styles.navButtonText, currentPage === totalPages - 1 && styles.navButtonTextDisabled]}>
                  Next
                </Text>
                <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages - 1 ? '#444' : '#fff'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  errorText: {
    color: '#e50914',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    padding: 16,
    gap: 16,
  },
  poster: {
    width: Platform.OS === 'web' ? 200 : '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  heroInfo: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  type: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    color: '#ffc107',
    fontWeight: '600',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  genreChip: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    color: '#fff',
    fontSize: 12,
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#e50914',
  },
  tabText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
  },
  // Details
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  detailLabel: {
    color: '#888',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  // Cast
  castGrid: {
    gap: 16,
  },
  castItem: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
  },
  castRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  castPerson: {
    flex: 1,
    alignItems: 'center',
  },
  castConnector: {
    paddingHorizontal: 8,
  },
  castImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#222',
    marginBottom: 8,
  },
  castName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  castRole: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  // Studio
  studioList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  studioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  studioName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  producerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  producerChip: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  producerName: {
    color: '#aaa',
    fontSize: 12,
  },
  // Horizontal scroll for web
  horizontalScroll: {
    ...Platform.select({
      web: {
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin',
      } as any,
      default: {},
    }),
  },
  // Anime cards
  animeRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  animeCard: {
    width: 120,
  },
  animeCardImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#222',
    marginBottom: 8,
  },
  animeCardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  animeCardType: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  // Episodes
  episodesSection: {
    padding: 16,
  },
  episodesGrid: {
    gap: 8,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  episodeNumber: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  episodeTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  noEpisodes: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  // Pagination styles
  paginationContainer: {
    marginBottom: 16,
  },
  paginationContent: {
    gap: 8,
    paddingVertical: 4,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  pageButtonActive: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  pageButtonText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  pageButtonTextActive: {
    color: '#fff',
  },
  paginationNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#222',
    gap: 4,
  },
  navButtonDisabled: {
    backgroundColor: '#111',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  navButtonTextDisabled: {
    color: '#444',
  },
  pageIndicator: {
    color: '#888',
    fontSize: 14,
  },
  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
    alignSelf: 'flex-start',
  },
  saveButtonActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderWidth: 1,
    borderColor: '#e50914',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonTextActive: {
    color: '#e50914',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#0a0a0a',
    gap: 12,
  },
  statusOptionActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderWidth: 1,
    borderColor: '#e50914',
  },
  statusOptionText: {
    color: '#888',
    fontSize: 15,
  },
  statusOptionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  removeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e50914',
    justifyContent: 'center',
    gap: 8,
  },
  removeOptionText: {
    color: '#e50914',
    fontSize: 14,
    fontWeight: '500',
  },
});
