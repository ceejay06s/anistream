import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { communityService, Post, Comment, type MediaFileInput } from '@/services/communityService';
import { userNotificationService } from '@/services/userNotificationService';
import { withRecaptcha } from '@/utils/withRecaptcha';
import { PostCard } from '@/components/PostCard';
import { CommentsModal } from '@/components/CommentsModal';

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Subscribe to unread notification count for bell badge
  useEffect(() => {
    if (!user) return;
    const unsubscribe = userNotificationService.subscribeToUnreadCount(
      user.uid,
      setUnreadNotifications
    );
    return () => unsubscribe();
  }, [user]);

  // Create post modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  type SelectedMediaItem = { file?: File; uri?: string; preview: string; type: 'image' | 'video'; name?: string };
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref to prevent modal from reopening immediately after closing
  const modalClosingRef = useRef(false);

  // Comments modal
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentInputRef = useRef<TextInput>(null);
  const commentUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = communityService.subscribeToPosts(30, (data) => {
      setPosts(data);
      setLoading(false);
      setRefreshing(false);
    });
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 10000);
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Real-time listener auto-updates; just reset the flag after a moment
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    if (modalClosingRef.current) return; // Prevent multiple close calls
    modalClosingRef.current = true;
    setShowCreateModal(false);
    // Clean up previews when closing
    setSelectedMedia((prev) => {
      if (Platform.OS === 'web' && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        prev.forEach((m) => URL.revokeObjectURL(m.preview));
      }
      return [];
    });
    setNewPostContent('');
    // Reset the flag after a short delay to allow modal to fully close
    setTimeout(() => {
      modalClosingRef.current = false;
    }, 400);
  }, []);
  
  // Memoized handler to prevent TextInput cursor issues
  const handlePostContentChange = useCallback((text: string) => {
    setNewPostContent(text);
  }, []);
  
  // Memoized handler for comment input - removed to prevent re-render issues
  // Using setNewComment directly in TextInput for better performance

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newMedia: { file: File; preview: string; type: 'image' | 'video' }[] = [];

    Array.from(files).forEach((file) => {
      if (selectedMedia.length + newMedia.length >= 4) return; // Max 4 media items

      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) return;

      // Check file size (max 50MB for videos, 10MB for images)
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        console.warn(`File ${file.name} is too large`);
        return;
      }

      const preview = URL.createObjectURL(file);
      newMedia.push({
        file,
        preview,
        type: isVideo ? 'video' : 'image',
      });
    });

    setSelectedMedia([...selectedMedia, ...newMedia]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia((prev) => {
      const updated = [...prev];
      if (Platform.OS === 'web' && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(updated[index].preview);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const pickMediaNative = useCallback(async (mediaTypes: 'images' | 'videos' | 'all') => {
    if (selectedMedia.length >= 4) return;
    try {
      const { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } = await import('expo-image-picker');
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Media library permission denied');
        return;
      }
      const result = await launchImageLibraryAsync({
        mediaTypes: mediaTypes === 'all' ? ['images', 'videos'] : mediaTypes === 'images' ? ['images'] : ['videos'],
        allowsMultipleSelection: true,
        selectionLimit: 4 - selectedMedia.length,
        videoMaxDuration: 60,
      });
      if (result.canceled) return;
      const newItems: SelectedMediaItem[] = result.assets.map((asset) => ({
        uri: asset.uri,
        preview: asset.uri,
        type: (asset.type ?? 'image') === 'video' ? 'video' : 'image',
        name: asset.fileName ?? undefined,
      }));
      setSelectedMedia((prev) => [...prev, ...newItems].slice(0, 4));
    } catch (err) {
      console.error('Failed to pick media:', err);
    }
  }, [selectedMedia.length]);

  const handleCreatePost = async () => {
    if (!user || (!newPostContent.trim() && selectedMedia.length === 0)) return;

    setSubmitting(true);
    try {
      await withRecaptcha('create_post');

      const mediaFiles: MediaFileInput[] = selectedMedia.map((m) =>
        m.file
          ? m.file
          : { uri: m.uri!, type: m.type === 'video' ? 'video/mp4' : 'image/jpeg', name: m.name }
      );
      const newPost = await communityService.createPost(
        { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL },
        newPostContent.trim(),
        undefined,
        undefined,
        mediaFiles.length > 0 ? mediaFiles : undefined
      );
      setPosts([newPost, ...posts]);
      // Clear form and close modal first
      setNewPostContent('');
      // Clean up previews (web only)
      if (Platform.OS === 'web' && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        selectedMedia.forEach((m) => URL.revokeObjectURL(m.preview));
      }
      setSelectedMedia([]);
      handleCloseCreateModal();
    } catch (err) {
      console.error('Failed to create post:', err);
      const message = err instanceof Error ? err.message : 'Post failed. Try again.';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Post failed', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      router.push('/(tabs)/profile');
      return;
    }

    try {
      // Real-time listener handles the UI update automatically — no manual setPosts needed
      await communityService.toggleLike(user.uid, postId);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    try {
      // Real-time listener handles the UI update automatically
      await communityService.deletePost(user.uid, postId);
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const openComments = (post: Post) => {
    // Unsubscribe from any previous comment subscription
    if (commentUnsubscribeRef.current) {
      commentUnsubscribeRef.current();
      commentUnsubscribeRef.current = null;
    }

    setSelectedPost(post);
    setNewComment('');
    setLoadingComments(true);
    setComments([]);

    const unsubscribe = communityService.subscribeToComments(post.id, (data) => {
      setComments(data);
      setLoadingComments(false);
    });
    commentUnsubscribeRef.current = unsubscribe;
  };

  const closeComments = () => {
    if (commentUnsubscribeRef.current) {
      commentUnsubscribeRef.current();
      commentUnsubscribeRef.current = null;
    }
    setSelectedPost(null);
    setComments([]);
    setNewComment('');
  };

  const handleAddComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await withRecaptcha('add_comment');

      await communityService.addComment(
        { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL },
        selectedPost.id,
        newComment.trim()
      );
      setNewComment('');
      // Update comment count in posts list
      setPosts(prev =>
        prev.map(post =>
          post.id === selectedPost.id
            ? { ...post, commentCount: post.commentCount + 1 }
            : post
        )
      );
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      currentUserId={user?.uid}
      onLike={handleLike}
      onComment={openComments}
      onDelete={handleDeletePost}
      showMedia
    />
  );

  // Not logged in view (web: full prompt + list; native: fall through to main content so list still renders)
  if (!user && Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Community</Text>
        </View>
        <View style={styles.loginPrompt}>
          <Ionicons name="chatbubbles-outline" size={64} color="#444" />
          <Text style={styles.loginPromptTitle}>Join the Community</Text>
          <Text style={styles.loginPromptText}>
            Sign in to create posts, comment, and interact with other anime fans.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.browseText}>Browse Community Posts</Text>
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#e50914"
            />
          }
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={styles.loadingText}>Loading community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Create Post Modal */}
      <Modal 
        visible={showCreateModal && !modalClosingRef.current} 
        animationType="slide" 
        transparent
        onRequestClose={handleCloseCreateModal}
        onDismiss={() => {
          // Ensure state is clean when modal is dismissed
          if (!showCreateModal) {
            setNewPostContent('');
            setSelectedMedia([]);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.createModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={handleCloseCreateModal}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TextInput
              key="create-post-input"
              style={styles.postInput}
              placeholder="Share your thoughts with the community..."
              placeholderTextColor="#666"
              value={newPostContent}
              onChangeText={handlePostContentChange}
              multiline
              maxLength={500}
              autoFocus={false}
            />

            {/* Media Preview */}
            {selectedMedia.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreviewContainer}>
                {selectedMedia.map((media, index) => (
                  <View key={index} style={styles.mediaPreviewItem}>
                    {media.type === 'image' ? (
                      <Image source={{ uri: media.preview }} style={styles.mediaPreviewImage} />
                    ) : (
                      <View style={styles.mediaPreviewVideo}>
                        <Ionicons name="play-circle" size={32} color="#fff" />
                      </View>
                    )}
                    <TouchableOpacity style={styles.removeMediaButton} onPress={() => removeMedia(index)}>
                      <Ionicons name="close-circle" size={24} color="#e50914" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <View style={styles.footerLeft}>
                {Platform.OS === 'web' ? (
                  <>
                    <input
                      ref={fileInputRef as any}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaSelect as any}
                      style={{ display: 'none' }}
                    />
                    <TouchableOpacity
                      style={[styles.mediaButton, selectedMedia.length >= 4 && styles.mediaButtonDisabled]}
                      onPress={() => fileInputRef.current?.click()}
                      disabled={selectedMedia.length >= 4}
                    >
                      <Ionicons name="image-outline" size={22} color={selectedMedia.length >= 4 ? '#444' : '#888'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.mediaButton, selectedMedia.length >= 4 && styles.mediaButtonDisabled]}
                      onPress={() => fileInputRef.current?.click()}
                      disabled={selectedMedia.length >= 4}
                    >
                      <Ionicons name="videocam-outline" size={22} color={selectedMedia.length >= 4 ? '#444' : '#888'} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.mediaButton, selectedMedia.length >= 4 && styles.mediaButtonDisabled]}
                      onPress={() => pickMediaNative('images')}
                      disabled={selectedMedia.length >= 4}
                    >
                      <Ionicons name="image-outline" size={22} color={selectedMedia.length >= 4 ? '#444' : '#888'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.mediaButton, selectedMedia.length >= 4 && styles.mediaButtonDisabled]}
                      onPress={() => pickMediaNative('videos')}
                      disabled={selectedMedia.length >= 4}
                    >
                      <Ionicons name="videocam-outline" size={22} color={selectedMedia.length >= 4 ? '#444' : '#888'} />
                    </TouchableOpacity>
                  </>
                )}
                <Text style={styles.charCount}>{newPostContent.length}/500</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.postButton,
                  (!newPostContent.trim() && selectedMedia.length === 0) || submitting ? styles.postButtonDisabled : null,
                ]}
                onPress={handleCreatePost}
                disabled={(!newPostContent.trim() && selectedMedia.length === 0) || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CommentsModal
        visible={!!selectedPost}
        title="Comments"
        comments={comments}
        loading={loadingComments}
        submitting={submittingComment}
        newComment={newComment}
        onChangeComment={setNewComment}
        onSubmit={handleAddComment}
        onClose={closeComments}
        currentUserId={user?.uid}
      />

      <View style={styles.header}>
        {/* Notification bell — top left */}
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.push('/(tabs)/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#fff" />
          {unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Community</Text>

        {/* Spacer to keep title centered */}
        <View style={styles.headerSpacer} />
      </View>

      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#444" />
          <Text style={styles.emptyStateTitle}>No posts yet</Text>
          <Text style={styles.emptyStateText}>
            Be the first to share something with the community!
          </Text>
          {user && (
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => {
                if (modalClosingRef.current || showCreateModal) return;
                setShowCreateModal(true);
              }}
            >
              <Text style={styles.createFirstButtonText}>Create Post</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#e50914"
            />
          }
        />
      )}

      {/* FAB — floating add post button */}
      {user && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            if (modalClosingRef.current || showCreateModal) return;
            setShowCreateModal(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
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
  headerSpacer: {
    width: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.4)',
    elevation: 8,
  },
  postsList: {
    padding: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  postTime: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  postContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  animeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  animeTagText: {
    color: '#e50914',
    fontSize: 12,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#888',
    fontSize: 14,
  },
  actionTextActive: {
    color: '#e50914',
  },
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  createFirstButton: {
    backgroundColor: '#e50914',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Login prompt
  loginPrompt: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  loginPromptTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  loginPromptText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  loginButton: {
    backgroundColor: '#e50914',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  browseText: {
    color: '#888',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  commentsModalInner: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.85,
    minHeight: Dimensions.get('window').height * 0.5,
    overflow: 'hidden',
  },
  createModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    minHeight: 250,
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.8)',
    }),
  },
  commentsModalContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentsModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  commentsContent: {
    flex: 1,
    minHeight: 200,
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  commentsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  postInput: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
    padding: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  charCount: {
    color: '#666',
    fontSize: 12,
  },
  postButton: {
    backgroundColor: '#e50914',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Comments
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    padding: 16,
    paddingBottom: 8,
  },
  commentItem: {
    marginBottom: 16,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  commentAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAuthorName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  commentTime: {
    color: '#666',
    fontSize: 11,
  },
  commentContent: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 32,
  },
  emptyComments: {
    alignItems: 'center',
    padding: 32,
  },
  emptyCommentsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyCommentsSubtext: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#fff',
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#e50914',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Media styles
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaItem: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaItemSingle: {
    width: '100%',
    height: 300,
  },
  mediaItemHalf: {
    width: '49%',
    height: 200,
  },
  mediaItemQuarter: {
    width: '49%',
    height: 150,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Media preview in create modal
  mediaPreviewContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 8,
  },
  mediaPreviewItem: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mediaPreviewVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  mediaButtonDisabled: {
    opacity: 0.4,
  },
});
