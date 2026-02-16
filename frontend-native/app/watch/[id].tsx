import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  TextInput,
  Modal,
  FlatList,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoPlayer } from '@/components/VideoPlayer';
import { streamingApi, StreamingData, StreamingSource, animeApi, Episode, AnimeInfo } from '@/services/api';
import { useStreamSocket } from '@/hooks/useStreamSocket';
import { useAuth } from '@/context/AuthContext';
import { communityService, Post, Comment } from '@/services/communityService';
import { executeRecaptcha } from '@/utils/recaptcha';
import { isRecaptchaEnabled, RECAPTCHA_SITE_KEY } from '@/config/recaptcha';
import { verifyRecaptchaToken } from '@/services/recaptchaService';

export default function WatchScreen() {
  const { id, ep, episodeId } = useLocalSearchParams<{ id: string; ep?: string; episodeId?: string }>();
  const router = useRouter();
  const episodeNumber = ep || '1';
  const fullEpisodeId = episodeId ? decodeURIComponent(episodeId) : `${id}?ep=${episodeNumber}`;

  const [category, setCategory] = useState<'sub' | 'dub'>('sub');
  const [useWebSocket, setUseWebSocket] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  
  // Community features
  const { user } = useAuth();
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newComment, setNewComment] = useState('');
  const [clippedTimestamp, setClippedTimestamp] = useState<number | null>(null);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  // Ref to prevent modal from reopening immediately after closing
  const modalClosingRef = useRef(false);

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
  const fromCache = wsStatus.fromCache;

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
      loadAnimeInfo();
      loadEpisodePosts();
    }
  }, [id, ep]);

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

  const loadAnimeInfo = async () => {
    if (!id) return;
    try {
      const info = await animeApi.getInfo(id);
      setAnimeInfo(info);
    } catch (err) {
      console.error('Failed to load anime info:', err);
    }
  };

  const loadEpisodePosts = async () => {
    if (!id) return;
    try {
      setLoadingPosts(true);
      const allPosts = await communityService.getPosts(50);
      // Filter posts for this anime (episode-specific filtering can be added later)
      const episodePosts = allPosts.filter(
        post => post.animeId === id
      );
      setPosts(episodePosts);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadComments = async (postId?: string) => {
    // Use selected post ID or create episode-specific post ID
    const targetPostId = postId || selectedPost?.id || `episode-${id}-${episodeNumber}`;
    try {
      setLoadingComments(true);
      const episodeComments = await communityService.getComments(targetPostId);
      setComments(episodeComments);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleClipScene = () => {
    if (modalClosingRef.current) return; // Prevent opening if modal is closing
    setClippedTimestamp(currentVideoTime);
    setNewPostContent(`Amazing scene at ${formatTime(currentVideoTime)}! 🎬`);
    setShowPostModal(true);
  };
  
  const handleClosePostModal = () => {
    modalClosingRef.current = true;
    setShowPostModal(false);
    // Reset the flag after a short delay to allow modal to fully close
    setTimeout(() => {
      modalClosingRef.current = false;
    }, 300);
  };

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) return;
    
    try {
      setSubmittingPost(true);
      
      // Verify reCAPTCHA if enabled
      if (isRecaptchaEnabled() && Platform.OS === 'web') {
        try {
          const token = await executeRecaptcha(RECAPTCHA_SITE_KEY, 'create_post');
          // Verify token with backend
          const isValid = await verifyRecaptchaToken(token);
          if (!isValid) {
            throw new Error('reCAPTCHA verification failed');
          }
        } catch (recaptchaError) {
          console.warn('reCAPTCHA verification failed:', recaptchaError);
          // Continue with post creation even if reCAPTCHA fails
          // In production, you might want to block the request
        }
      }
      
      // Include episode info and timestamp in post content if clipped
      let postContent = newPostContent;
      if (clippedTimestamp !== null) {
        postContent = `${newPostContent}\n\n🎬 Scene at ${formatTime(clippedTimestamp)} - Episode ${episodeNumber}`;
      } else {
        postContent = `${newPostContent}\n\n📺 Episode ${episodeNumber}`;
      }
      
      await communityService.createPost(
        {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
        postContent,
        id,
        animeInfo?.name,
        undefined // No media files for now
      );
      setNewPostContent('');
      setClippedTimestamp(null);
      handleClosePostModal();
      loadEpisodePosts();
    } catch (err: any) {
      console.error('Failed to create post:', err);
      alert(err.message || 'Failed to create post');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;
    
    const targetPostId = selectedPost?.id || `episode-${id}-${episodeNumber}`;
    try {
      setSubmittingComment(true);
      
      // Verify reCAPTCHA if enabled
      if (isRecaptchaEnabled() && Platform.OS === 'web') {
        try {
          const token = await executeRecaptcha(RECAPTCHA_SITE_KEY, 'add_comment');
          // Verify token with backend
          const isValid = await verifyRecaptchaToken(token);
          if (!isValid) {
            throw new Error('reCAPTCHA verification failed');
          }
        } catch (recaptchaError) {
          console.warn('reCAPTCHA verification failed:', recaptchaError);
          // Continue with comment creation even if reCAPTCHA fails
          // In production, you might want to block the request
        }
      }
      
      await communityService.addComment(
        {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
        targetPostId,
        newComment
      );
      setNewComment('');
      await loadComments(targetPostId);
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      alert(err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        {/* Header - only show on native (web has controls embedded in player) */}
        {Platform.OS !== 'web' && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.episodeTitle}>Episode {episodeNumber}</Text>
          </View>
        )}

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
              title={id?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              onBack={handleBack}
              onCurrentTimeChange={setCurrentVideoTime}
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
            {fromCache ? ' • Cached' : totalServers > 0 ? ` (${serverIndex + 1}/${totalServers})` : ''}
          </Text>
          {retryMessage && (
            <Text style={styles.retryingText}>{retryMessage}</Text>
          )}
        </View>

        {/* Community Section */}
        <View style={styles.communitySection}>
          <View style={styles.communityHeader}>
            <Text style={styles.communityTitle}>Community</Text>
            <View style={styles.communityActions}>
              <TouchableOpacity
                style={styles.clipButton}
                onPress={handleClipScene}
              >
                <Ionicons name="videocam" size={18} color="#fff" />
                <Text style={styles.clipButtonText}>Clip Scene</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postButton}
                onPress={() => {
                  if (modalClosingRef.current) return; // Prevent opening if modal is closing
                  setClippedTimestamp(null);
                  setNewPostContent('');
                  setShowPostModal(true);
                }}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.commentButton}
                onPress={async () => {
                  setSelectedPost(null);
                  await loadComments();
                  setShowCommentsModal(true);
                }}
              >
                <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
                <Text style={styles.commentButtonText}>
                  Comments {comments.length > 0 && `(${comments.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Posts List */}
          {loadingPosts ? (
            <ActivityIndicator size="small" color="#e50914" style={styles.loadingIndicator} />
          ) : posts.length > 0 ? (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.postItem}>
                  <View style={styles.postHeader}>
                    {item.userPhoto ? (
                      <Image source={{ uri: item.userPhoto }} style={styles.postAvatar} />
                    ) : (
                      <View style={styles.postAvatarPlaceholder}>
                        <Ionicons name="person" size={16} color="#888" />
                      </View>
                    )}
                    <View style={styles.postHeaderText}>
                      <Text style={styles.postUserName}>{item.userName}</Text>
                      <Text style={styles.postTime}>{communityService.formatTimeAgo(item.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.postContent}>{item.content}</Text>
                  {item.animeName && (
                    <Text style={styles.postAnime}>📺 {item.animeName}</Text>
                  )}
                  <View style={styles.postFooter}>
                    <TouchableOpacity
                      style={styles.postAction}
                      onPress={async () => {
                        if (user) {
                          await communityService.toggleLike(user.uid, item.id);
                          loadEpisodePosts();
                        }
                      }}
                    >
                      <Ionicons
                        name={user && item.likes.includes(user.uid) ? 'heart' : 'heart-outline'}
                        size={18}
                        color={user && item.likes.includes(user.uid) ? '#e50914' : '#888'}
                      />
                      <Text style={styles.postActionText}>{item.likes.length}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.postAction}
                      onPress={async () => {
                        setSelectedPost(item);
                        await loadComments(item.id);
                        setShowCommentsModal(true);
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color="#888" />
                      <Text style={styles.postActionText}>{item.commentCount}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          ) : (
            <Text style={styles.noPostsText}>No posts yet. Be the first to share your thoughts!</Text>
          )}
        </View>
      </ScrollView>

      {/* Create Post Modal */}
      <Modal
        visible={showPostModal}
        transparent
        animationType="slide"
        onRequestClose={handleClosePostModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={handleClosePostModal}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {clippedTimestamp !== null && (
              <View style={styles.clipInfo}>
                <Ionicons name="videocam" size={16} color="#e50914" />
                <Text style={styles.clipInfoText}>Scene clipped at {formatTime(clippedTimestamp)}</Text>
              </View>
            )}
            <TextInput
              style={styles.postInput}
              placeholder="Share your thoughts about this episode..."
              placeholderTextColor="#666"
              multiline
              value={newPostContent}
              onChangeText={setNewPostContent}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submitButton, (!user || !newPostContent.trim() || submittingPost) && styles.submitButtonDisabled]}
              onPress={handleCreatePost}
              disabled={!user || !newPostContent.trim() || submittingPost}
            >
              {submittingPost ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCommentsModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Comments {selectedPost ? `on ${selectedPost.userName}'s post` : `on Episode ${episodeNumber}`}
              </Text>
              <TouchableOpacity onPress={() => setShowCommentsModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.commentsList}>
              {loadingComments ? (
                <ActivityIndicator size="small" color="#e50914" style={styles.loadingIndicator} />
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    {comment.userPhoto ? (
                      <Image source={{ uri: comment.userPhoto }} style={styles.commentAvatar} />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder}>
                        <Ionicons name="person" size={14} color="#888" />
                      </View>
                    )}
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUserName}>{comment.userName}</Text>
                      <Text style={styles.commentText}>{comment.content}</Text>
                      <Text style={styles.commentTime}>{communityService.formatTimeAgo(comment.createdAt)}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
              )}
            </ScrollView>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#666"
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, (!user || !newComment.trim() || submittingComment) && styles.sendButtonDisabled]}
                onPress={handleAddComment}
                disabled={!user || !newComment.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  communitySection: {
    padding: 16,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  communityHeader: {
    marginBottom: 16,
  },
  communityTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  communityActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  clipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#e50914',
    borderRadius: 8,
  },
  clipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  commentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  postItem: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  postAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postHeaderText: {
    flex: 1,
  },
  postUserName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  postTime: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  postContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  postAnime: {
    color: '#e50914',
    fontSize: 12,
    marginBottom: 8,
  },
  postFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    color: '#888',
    fontSize: 14,
  },
  noPostsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  clipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  clipInfoText: {
    color: '#e50914',
    fontSize: 14,
    fontWeight: '500',
  },
  postInput: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  submitButton: {
    backgroundColor: '#e50914',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  commentsList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  commentAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentUserName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    color: '#666',
    fontSize: 11,
  },
  noCommentsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendButton: {
    backgroundColor: '#e50914',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
});
