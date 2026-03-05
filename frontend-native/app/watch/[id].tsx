import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  TextInput,
  Modal,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  useWindowDimensions,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoPlayer } from '@/components/VideoPlayer';
import { StreamingData, StreamingSource, Episode } from '@/services/api';
import { useStreamSocket } from '@/hooks/useStreamSocket';
import { shouldRenderPlayer } from '@/components/playerFallback';
import { useAuth } from '@/context/AuthContext';
import { communityService, Post, Comment } from '@/services/communityService';
import { withRecaptcha } from '@/utils/withRecaptcha';
import { formatTime } from '@/utils/formatTime';
import { PostCard } from '@/components/PostCard';
import { CommentsModal } from '@/components/CommentsModal';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { useEpisodeData } from '@/hooks/useEpisodeData';
import { ResumeWatchingPrompt } from '@/components/ResumeWatchingPrompt';
import { EpisodeSidebar } from '@/components/EpisodeSidebar';
import { styles } from '@/styles/watchScreen.styles';

export default function WatchScreen() {
  const { id, ep, episodeId } = useLocalSearchParams<{ id: string; ep?: string; episodeId?: string }>();
  const router = useRouter();
  const episodeNumber = ep || '1';
  const fullEpisodeId = episodeId ? decodeURIComponent(episodeId) : `${id}?ep=${episodeNumber}`;

  const [category, setCategory] = useState<'sub' | 'dub'>('sub');

  // Community features
  const { user } = useAuth();
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newComment, setNewComment] = useState('');
  const [clippedTimestamp, setClippedTimestamp] = useState<number | null>(null);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Episode data (episodes, animeInfo, posts, refresh)
  const {
    episodes,
    episodesLoading,
    animeInfo,
    posts,
    loadingPosts,
    refreshing,
    onRefresh,
    loadEpisodePosts,
  } = useEpisodeData(id, episodeNumber);

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

  const loading = wsStatus.isLoading;
  const error = wsStatus.error;
  const streamingData = wsStreamingData;
  const selectedSource = wsSelectedSource;
  const retryMessage = wsStatus.message;
  const currentServer = wsStatus.currentServer;
  const serverIndex = wsStatus.serverIndex;
  const totalServers = wsStatus.totalServers;
  const fromCache = wsStatus.fromCache;
  const iframeFallbackUrl = wsStatus.iframeFallback;

  // Timeout state for auto-retry with 30-second limit
  const [retryTimedOut, setRetryTimedOut] = useState(false);
  const [retryElapsed, setRetryElapsed] = useState(0);
  const retryStartTimeRef = useRef<number | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Count how many times the player has requested a new source (to break retry loops)
  const requestNewSourceCountRef = useRef(0);

  // Start/stop retry timer based on loading state
  useEffect(() => {
    if (loading && !selectedSource) {
      // Only set the start time on the first load, not on retries — so the 30-second
      // countdown measures total wall-clock time across all server attempts.
      if (retryStartTimeRef.current === null) {
        retryStartTimeRef.current = Date.now();
        setRetryTimedOut(false);
        setRetryElapsed(0);
      }

      // (Re-)start the interval so the counter ticks even after a mid-retry pause.
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }
      retryTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (retryStartTimeRef.current || Date.now())) / 1000);
        setRetryElapsed(elapsed);

        if (elapsed >= 30) {
          // Timeout reached - stop trying
          setRetryTimedOut(true);
          if (retryTimerRef.current) {
            clearInterval(retryTimerRef.current);
            retryTimerRef.current = null;
          }
        }
      }, 1000);
    } else {
      // Stop the timer when not loading or source found
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (selectedSource) {
        // A working source was found — reset the loading timer so the next
        // failure (if any) starts a fresh 30-second window.
        // NOTE: requestNewSourceCountRef is intentionally NOT reset here;
        // it only resets in loadSources() so consecutive CDN-block failures
        // across multiple server retries accumulate toward the limit.
        retryStartTimeRef.current = null;
        setRetryTimedOut(false);
        setRetryElapsed(0);
      }
    }

    return () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [loading, selectedSource]);

  // Watch progress (resume prompt + auto-save)
  const {
    resumeTimestamp,
    showResumePrompt,
    handleResumeYes,
    handleResumeNo,
  } = useWatchProgress({
    animeId: id,
    episodeNumber,
    fullEpisodeId,
    animeInfo,
    currentVideoTime,
  });

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

  const handleClipScene = useCallback(() => {
    if (showPostModal) return;
    setClippedTimestamp(currentVideoTime);
    setNewPostContent(`Amazing scene at ${formatTime(currentVideoTime)}! 🎬`);
    setShowPostModal(true);
  }, [currentVideoTime, showPostModal]);

  const handleClosePostModal = useCallback(() => {
    setShowPostModal(false);
    setNewPostContent('');
    setClippedTimestamp(null);
  }, []);
  
  // Memoized handler to prevent TextInput cursor issues
  const handlePostContentChange = useCallback((text: string) => {
    setNewPostContent(text);
  }, []);

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) return;
    
    try {
      setSubmittingPost(true);
      
      await withRecaptcha('create_post');

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
      // Close modal and reload posts
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
      
      await withRecaptcha('add_comment');

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

    // Reset retry state for a fresh load (episode change or explicit user retry).
    retryStartTimeRef.current = null;
    requestNewSourceCountRef.current = 0;

    wsRequestSources(fullEpisodeId, category);
  };

  // Handle request for new source when streaming fails (e.g. 403, playback error)
  // Skip cache so we don't keep returning the same failing source (retry loop)
  const MAX_SOURCE_RETRIES = 5;
  const handleRequestNewSource = () => {
    requestNewSourceCountRef.current += 1;
    if (requestNewSourceCountRef.current > MAX_SOURCE_RETRIES) {
      // All servers have been tried without a playable stream — stop retrying so the
      // player can settle on its error state (which shows an iframe option on web).
      return;
    }
    wsRetry({ skipCache: true, failedServer: currentServer ?? undefined });
  };

  const handleQualityChange = (_source: { url: string; quality: string }) => {
    // Quality selection is not supported on the WebSocket streaming path
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
            wsRetry({ skipCache: true, failedServer: currentServer ?? undefined });
          }}>
            <Text style={styles.retryText}>Retry All Servers</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  // Desktop layout only for wide screens (>1024px)
  const isDesktopWeb = isWeb && windowWidth > 1024;

  // Render main content section (video details + community) - for LEFT side on desktop
  const renderMainContent = () => (
    <>
      {/* Anime Info Card */}
      {animeInfo && (
        <View style={[styles.animeInfoCard, isDesktopWeb && styles.animeInfoCardWeb]}>
          {animeInfo.poster && (
            <Image source={{ uri: animeInfo.poster }} style={styles.animeInfoPoster} />
          )}
          <View style={styles.animeInfoDetails}>
            <Text style={styles.animeInfoName} numberOfLines={2}>{animeInfo.name}</Text>
            <Text style={styles.animeInfoEpisode}>Episode {episodeNumber}</Text>
            {animeInfo.genres?.length > 0 && (
              <Text style={styles.animeInfoGenres} numberOfLines={1}>
                {animeInfo.genres.slice(0, 3).join(' • ')}
              </Text>
            )}
            {(animeInfo.episodes?.sub || animeInfo.episodes?.dub) && (
              <Text style={styles.animeInfoEpCount}>
                {animeInfo.episodes.sub ? `${animeInfo.episodes.sub} eps (SUB)` : ''}
                {animeInfo.episodes.sub && animeInfo.episodes.dub ? '  ' : ''}
                {animeInfo.episodes.dub ? `${animeInfo.episodes.dub} eps (DUB)` : ''}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Episode Info */}
      <View style={[styles.infoSection, isDesktopWeb && styles.infoSectionWeb]}>
        <Text style={styles.infoLabel}>Now Playing</Text>
        <Text style={styles.infoText}>Episode {episodeNumber} ({category.toUpperCase()})</Text>
        <Text style={styles.streamType}>
          WebSocket • Server: {currentServer?.toUpperCase() || 'HD-1'}
          {selectedSource?.isM3U8 ? ' • HLS' : ''}
          {fromCache ? ' • Cached' : totalServers > 0 ? ` (${serverIndex + 1}/${totalServers})` : ''}
        </Text>
        {retryMessage && (
          <Text style={styles.retryingText}>{retryMessage}</Text>
        )}
      </View>

      {/* Community Section */}
      <View style={[styles.communitySection, isDesktopWeb && styles.communitySectionWeb]}>
        <View style={styles.communityHeader}>
          <Text style={styles.communityTitle}>Community</Text>
          <View style={[styles.communityActions, isDesktopWeb && styles.communityActionsWeb]}>
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
                if (showPostModal) return;
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
              <PostCard
                post={item}
                currentUserId={user?.uid}
                onLike={async (postId) => {
                  if (user) {
                    await communityService.toggleLike(user.uid, postId);
                    loadEpisodePosts();
                  }
                }}
                onComment={async (post) => {
                  setSelectedPost(post);
                  await loadComments(post.id);
                  setShowCommentsModal(true);
                }}
              />
            )}
          />
        ) : (
          <Text style={styles.noPostsText}>No posts yet. Be the first to share your thoughts!</Text>
        )}
      </View>
    </>
  );

  // Render mobile details section (all content stacked)
  const renderDetailsSection = () => (
    <>
      {renderMainContent()}
    </>
  );

  // Render video player section
  const renderVideoPlayer = () => (
    <View style={[styles.playerContainer, isDesktopWeb && styles.playerContainerWeb]}>
      {retryTimedOut && !selectedSource && !iframeFallbackUrl ? (
        // Timeout error state
        <View style={styles.timeoutContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#e50914" />
          <Text style={styles.timeoutText}>Could not find a working server</Text>
          <Text style={styles.timeoutSubtext}>All servers failed to respond</Text>
          <TouchableOpacity
            style={styles.retryServerButton}
            onPress={() => {
              setRetryTimedOut(false);
              setRetryElapsed(0);
              retryStartTimeRef.current = null;
              wsRetry({ skipCache: true, failedServer: currentServer ?? undefined });
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryServerButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !selectedSource && !iframeFallbackUrl ? (
        // Same container as player – show spinner + option to switch to REST if stuck
        <View style={styles.videoLoadingContainer}>
          {animeInfo?.poster ? (
            <Image
              source={{ uri: animeInfo.poster }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.videoLoadingOverlay} />
          <ActivityIndicator size="large" color="#e50914" />
          {retryMessage ? <Text style={styles.loadingStatusText}>{retryMessage}</Text> : null}
        </View>
      ) : shouldRenderPlayer({
        selectedSourceUrl: selectedSource?.url,
        iframeFallbackUrl,
      }) ? (
        <VideoPlayer
          source={selectedSource?.url || ''}
          autoPlay={true}
          onError={(err) => console.error('Player error:', err)}
          onReady={() => {
            console.log('Player ready');
          }}
          animeId={id}
          episodeNumber={episodeNumber}
          fullEpisodeId={fullEpisodeId}
          iframeEmbedUrl={iframeFallbackUrl}
          subtitleTracks={streamingData?.tracks?.map(t => ({
            url: t.url,
            lang: t.lang,
            label: t.lang,
          })) || []}
          onRequestNewSource={handleRequestNewSource}
          title={id?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          onBack={handleBack}
          onCurrentTimeChange={setCurrentVideoTime}
          onPrevious={handlePreviousEpisode}
          onNext={handleNextEpisode}
          hasPrevious={hasPreviousEpisode}
          hasNext={hasNextEpisode}
          initialTime={showResumePrompt ? undefined : (resumeTimestamp || undefined)}
          category={category}
          onCategoryChange={setCategory}
          sources={streamingData?.sources}
          selectedSourceUrl={selectedSource?.url}
          onQualityChange={handleQualityChange}
          intro={streamingData?.intro}
          outro={streamingData?.outro}
        />
      ) : (
        // No source available - show error
        <View style={styles.noSourceContainer}>
          <Ionicons name="videocam-off-outline" size={48} color="#666" />
          <Text style={styles.noSourceText}>No video source available</Text>
          <TouchableOpacity
            style={styles.retryServerButton}
            onPress={() => {
              wsRetry({ skipCache: true, failedServer: currentServer ?? undefined });
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryServerButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isDesktopWeb && styles.headerWeb]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          {animeInfo?.name ? (
            <Text style={styles.headerAnimeName} numberOfLines={1}>{animeInfo.name}</Text>
          ) : null}
          <Text style={styles.episodeTitle}>Episode {episodeNumber}</Text>
        </View>
      </View>

      {/* Resume prompt - show above layout on both platforms */}
      <ResumeWatchingPrompt
        visible={showResumePrompt && !!resumeTimestamp}
        timestamp={resumeTimestamp ?? 0}
        isDesktopWeb={isDesktopWeb}
        onResume={handleResumeYes}
        onRestart={handleResumeNo}
      />

      {/* Desktop Web: Side-by-side layout (3:1 ratio) */}
      {isDesktopWeb ? (
        <View style={styles.webLayout}>
          {/* Left side - Video Player + Details + Community (75%) */}
          <ScrollView
            style={styles.webMainSection}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />
            }
          >
            {renderVideoPlayer()}
            <View style={styles.detailsWrapper}>{renderMainContent()}</View>
          </ScrollView>

          {/* Right side - Episode List + Recommendations (25%) */}
          <View style={styles.webSidebarSection}>
            <EpisodeSidebar
              episodes={episodes}
              episodesLoading={episodesLoading}
              currentEpNumber={currentEpNumber}
              animeInfo={animeInfo}
              onEpisodeSelect={navigateToEpisode}
            />
          </View>
        </View>
      ) : (
        // Mobile/Tablet/Narrow web: Stacked layout
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />
          }
        >
          {renderVideoPlayer()}
          <View style={styles.detailsWrapper}>{renderDetailsSection()}</View>
        </ScrollView>
      )}

      {/* Create Post Modal */}
      <Modal
        visible={showPostModal}
        transparent
        animationType="slide"
        onRequestClose={handleClosePostModal}
        statusBarTranslucent
        hardwareAccelerated
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
            <View style={[styles.clipInfo, clippedTimestamp === null && styles.clipInfoHidden]}>
              {clippedTimestamp !== null && (
                <>
                  <Ionicons name="videocam" size={16} color="#e50914" />
                  <Text style={styles.clipInfoText}>Scene clipped at {formatTime(clippedTimestamp)}</Text>
                </>
              )}
            </View>
            <TextInput
              key="post-input"
              style={styles.postInput}
              placeholder="Share your thoughts about this episode..."
              placeholderTextColor="#666"
              multiline
              value={newPostContent}
              onChangeText={handlePostContentChange}
              textAlignVertical="top"
              autoFocus={false}
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

      <CommentsModal
        visible={showCommentsModal}
        title={selectedPost ? `Comments on ${selectedPost.userName}'s post` : `Comments on Episode ${episodeNumber}`}
        comments={comments}
        loading={loadingComments}
        submitting={submittingComment}
        newComment={newComment}
        onChangeComment={setNewComment}
        onSubmit={handleAddComment}
        onClose={() => setShowCommentsModal(false)}
        currentUserId={user?.uid}
      />
    </SafeAreaView>
  );
}
