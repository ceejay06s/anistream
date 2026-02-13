import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoPlayer } from '@/components/VideoPlayer';
import { streamingApi, StreamingData, StreamingSource, animeApi, Episode } from '@/services/api';
import { useStreamSocket } from '@/hooks/useStreamSocket';

export default function WatchScreen() {
  const { id, ep, episodeId } = useLocalSearchParams<{ id: string; ep?: string; episodeId?: string }>();
  const router = useRouter();
  const episodeNumber = ep || '1';
  const fullEpisodeId = episodeId ? decodeURIComponent(episodeId) : `${id}?ep=${episodeNumber}`;

  const [category, setCategory] = useState<'sub' | 'dub'>('sub');
  const [useWebSocket, setUseWebSocket] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);

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
  }, [id, ep]);

  // WebSocket-based streaming (primary)
  const {
    status: wsStatus,
    streamingData: wsStreamingData,
    selectedSource: wsSelectedSource,
    requestSources: wsRequestSources,
    disconnect: wsDisconnect,
    retry: wsRetry,
  } = useStreamSocket();

  // Fallback state for REST API
  const [restLoading, setRestLoading] = useState(false);
  const [restError, setRestError] = useState<string | null>(null);
  const [restStreamingData, setRestStreamingData] = useState<StreamingData | null>(null);
  const [restSelectedSource, setRestSelectedSource] = useState<StreamingSource | null>(null);

  // Combined state
  const loading = useWebSocket ? wsStatus.isLoading : restLoading;
  const error = useWebSocket ? wsStatus.error : restError;
  const streamingData = useWebSocket ? wsStreamingData : restStreamingData;
  const selectedSource = useWebSocket ? wsSelectedSource : restSelectedSource;
  const retryMessage = useWebSocket ? wsStatus.message : null;
  const currentServer = wsStatus.currentServer;
  const serverIndex = wsStatus.serverIndex;
  const totalServers = wsStatus.totalServers;
  const iframeFallback = wsStatus.iframeFallback;

  // State for iframe mode
  const [useIframe, setUseIframe] = useState(false);

  // Auto-switch to iframe if we get iframe fallback and no sources
  useEffect(() => {
    if (iframeFallback && !selectedSource && !loading) {
      console.log('Auto-switching to iframe fallback');
      setUseIframe(true);
    }
  }, [iframeFallback, selectedSource, loading]);

  // Load episodes list for navigation
  useEffect(() => {
    if (id) {
      loadEpisodes();
    }
  }, [id]);

  const loadEpisodes = async () => {
    if (!id) return;
    try {
      setEpisodesLoading(true);
      const episodeList = await animeApi.getEpisodes(id);
      setEpisodes(episodeList);
    } catch (err) {
      console.error('Failed to load episodes:', err);
    } finally {
      setEpisodesLoading(false);
    }
  };

  // Load sources when episode/category changes
  useEffect(() => {
    if (id) {
      loadSources();
    }
    return () => {
      wsDisconnect();
    };
  }, [id, ep, category]);

  const loadSources = () => {
    if (!id) return;

    // Use the full episodeId from HiAnime (contains database ID) if available
    // Otherwise construct it from anime id and episode number
    const episodeIdStr = fullEpisodeId;

    if (useWebSocket) {
      // Use WebSocket for real-time server cycling
      wsRequestSources(episodeIdStr, category);
    } else {
      // Fallback to REST API
      loadSourcesRest(episodeIdStr);
    }
  };

  // REST API fallback
  const loadSourcesRest = async (episodeId: string) => {
    try {
      setRestLoading(true);
      setRestError(null);

      const data = await streamingApi.getSources(episodeId, 'hd-1', category);

      if (data && data.sources && data.sources.length > 0) {
        setRestStreamingData(data);
        setRestSelectedSource(data.sources[0]);
      } else {
        setRestError(category === 'dub'
          ? 'No dubbed version available. Try switching to SUB.'
          : 'No video sources available.');
      }
    } catch (err: any) {
      setRestError(err.message || 'Failed to load video');
    } finally {
      setRestLoading(false);
    }
  };

  // Handle request for new source when streaming fails (403 error)
  // WebSocket will handle the retry logic on the backend
  const handleRequestNewSource = () => {
    if (useWebSocket) {
      // WebSocket handles retries automatically
      wsRetry();
    } else {
      // REST fallback - just retry
      loadSources();
    }
  };

  const handleQualityChange = (source: StreamingSource) => {
    if (useWebSocket) {
      // For WebSocket, we can't directly set - need to select from streaming data
      // This is a UI-only change since sources are already loaded
    }
    setRestSelectedSource(source);
  };

  // Get the actual selected source (handling both WS and REST)
  const getSelectedSource = () => {
    return useWebSocket ? wsSelectedSource : restSelectedSource;
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push({
        pathname: '/detail/[id]',
        params: { id: id as string },
      });
    }
  };

  // Episode navigation
  const currentEpNumber = parseInt(episodeNumber, 10);
  const currentEpisodeIndex = episodes.findIndex(ep => ep.number === currentEpNumber);
  const hasPreviousEpisode = currentEpisodeIndex > 0;
  const hasNextEpisode = currentEpisodeIndex < episodes.length - 1 && currentEpisodeIndex !== -1;

  const navigateToEpisode = (episode: Episode) => {
    router.replace({
      pathname: '/watch/[id]',
      params: {
        id: id as string,
        ep: String(episode.number),
        episodeId: episode.episodeId,
      },
    });
  };

  const handlePreviousEpisode = () => {
    if (hasPreviousEpisode) {
      navigateToEpisode(episodes[currentEpisodeIndex - 1]);
    }
  };

  const handleNextEpisode = () => {
    if (hasNextEpisode) {
      navigateToEpisode(episodes[currentEpisodeIndex + 1]);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            if (useWebSocket) {
              wsRetry();
            } else {
              loadSources();
            }
          }}>
            <Text style={styles.retryText}>Retry All Servers</Text>
          </TouchableOpacity>
          {useWebSocket && (
            <TouchableOpacity
              style={[styles.retryButton, { marginTop: 8, backgroundColor: '#333' }]}
              onPress={() => {
                setUseWebSocket(false);
                loadSources();
              }}
            >
              <Text style={styles.retryText}>Use REST API</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.episodeTitle}>Episode {episodeNumber}</Text>
        </View>

        {/* Video Player */}
        <View style={styles.playerContainer}>
          {loading ? (
            // Loading state - contained within video area
            <View style={styles.videoLoadingContainer}>
              <ActivityIndicator size="large" color="#e50914" />
              <Text style={styles.videoLoadingText}>Loading video...</Text>
              {retryMessage && (
                <Text style={styles.videoLoadingMessage}>{retryMessage}</Text>
              )}
            </View>
          ) : useIframe && iframeFallback ? (
            // Iframe fallback player
            <View style={styles.iframeContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  src={iframeFallback}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                />
              ) : (
                <Text style={styles.iframeNotice}>
                  Iframe playback only available on web.{'\n'}
                  Please try again later or use web version.
                </Text>
              )}
              <View style={styles.iframeBanner}>
                <Text style={styles.iframeBannerText}>Playing via HiAnime (iframe fallback)</Text>
                <TouchableOpacity
                  style={styles.tryAgainButton}
                  onPress={() => {
                    setUseIframe(false);
                    loadSources();
                  }}
                >
                  <Text style={styles.tryAgainText}>Try Direct Stream</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : selectedSource ? (
            <VideoPlayer
              source={selectedSource.url}
              autoPlay={true}
              onError={(err) => console.error('Player error:', err)}
              onReady={() => {
                console.log('Player ready');
              }}
              animeId={id}
              episodeNumber={episodeNumber}
              fullEpisodeId={fullEpisodeId}
              subtitleTracks={streamingData?.tracks?.map(t => ({
                url: t.url,
                lang: t.lang,
                label: t.lang,
              })) || []}
              onRequestNewSource={handleRequestNewSource}
            />
          ) : iframeFallback ? (
            // Show button to switch to iframe
            <View style={styles.noSourceContainer}>
              <Text style={styles.noSourceText}>Direct streaming unavailable</Text>
              <TouchableOpacity
                style={styles.useIframeButton}
                onPress={() => setUseIframe(true)}
              >
                <Text style={styles.useIframeText}>Use Iframe Player</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Episode Navigation */}
        {episodes.length > 1 && (
          <View style={styles.episodeNavSection}>
            <TouchableOpacity
              style={[styles.episodeNavButton, !hasPreviousEpisode && styles.episodeNavButtonDisabled]}
              onPress={handlePreviousEpisode}
              disabled={!hasPreviousEpisode}
            >
              <Ionicons
                name="play-skip-back"
                size={20}
                color={hasPreviousEpisode ? '#fff' : '#444'}
              />
              <Text style={[styles.episodeNavText, !hasPreviousEpisode && styles.episodeNavTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <View style={styles.episodeIndicator}>
              <Text style={styles.episodeIndicatorText}>
                EP {currentEpNumber} / {episodes.length}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.episodeNavButton, !hasNextEpisode && styles.episodeNavButtonDisabled]}
              onPress={handleNextEpisode}
              disabled={!hasNextEpisode}
            >
              <Text style={[styles.episodeNavText, !hasNextEpisode && styles.episodeNavTextDisabled]}>
                Next
              </Text>
              <Ionicons
                name="play-skip-forward"
                size={20}
                color={hasNextEpisode ? '#fff' : '#444'}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Sub/Dub Toggle */}
        <View style={styles.categorySection}>
          <Text style={styles.qualityLabel}>Audio:</Text>
          <View style={styles.qualityOptions}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                category === 'sub' && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory('sub')}
            >
              <Text
                style={[
                  styles.qualityText,
                  category === 'sub' && styles.qualityTextActive,
                ]}
              >
                SUB
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                category === 'dub' && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory('dub')}
            >
              <Text
                style={[
                  styles.qualityText,
                  category === 'dub' && styles.qualityTextActive,
                ]}
              >
                DUB
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quality Selector */}
        {streamingData && streamingData.sources.length > 1 && (
          <View style={styles.qualitySection}>
            <Text style={styles.qualityLabel}>Quality:</Text>
            <View style={styles.qualityOptions}>
              {streamingData.sources.map((source, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.qualityButton,
                    selectedSource?.url === source.url && styles.qualityButtonActive,
                  ]}
                  onPress={() => handleQualityChange(source)}
                >
                  <Text
                    style={[
                      styles.qualityText,
                      selectedSource?.url === source.url && styles.qualityTextActive,
                    ]}
                  >
                    {source.quality}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Episode Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Now Playing</Text>
          <Text style={styles.infoText}>Episode {episodeNumber} ({category.toUpperCase()})</Text>
          <Text style={styles.streamType}>
            {useWebSocket ? 'WebSocket' : 'REST'} • Server: {currentServer?.toUpperCase() || 'HD-1'}
            {selectedSource?.isM3U8 ? ' • HLS' : ''}
            {totalServers > 0 ? ` (${serverIndex + 1}/${totalServers})` : ''}
          </Text>
          {retryMessage && (
            <Text style={styles.retryingText}>{retryMessage}</Text>
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
  retryMessageText: {
    color: '#888',
    marginTop: 8,
    fontSize: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  videoLoadingContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLoadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  videoLoadingMessage: {
    color: '#888',
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  categorySection: {
    padding: 16,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
    paddingBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryButtonActive: {
    backgroundColor: '#1a5fb4',
    borderColor: '#1a5fb4',
  },
  qualitySection: {
    padding: 16,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
  },
  qualityLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  qualityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  qualityButtonActive: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  qualityText: {
    color: '#888',
    fontSize: 14,
  },
  qualityTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  infoSection: {
    padding: 16,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  streamType: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  retryingText: {
    color: '#e50914',
    fontSize: 12,
    marginTop: 4,
  },
  iframeContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  iframeBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(229, 9, 20, 0.9)',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iframeBannerText: {
    color: '#fff',
    fontSize: 12,
  },
  tryAgainButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tryAgainText: {
    color: '#fff',
    fontSize: 11,
  },
  iframeNotice: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  noSourceContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSourceText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  useIframeButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  useIframeText: {
    color: '#fff',
    fontWeight: '600',
  },
  episodeNavSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  episodeNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  episodeNavButtonDisabled: {
    backgroundColor: '#111',
    borderColor: '#222',
  },
  episodeNavText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  episodeNavTextDisabled: {
    color: '#444',
  },
  episodeIndicator: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  episodeIndicatorText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
});
