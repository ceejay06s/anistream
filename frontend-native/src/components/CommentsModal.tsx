import {
  View,
  Text,
  Image,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { communityService, Comment } from '@/services/communityService';
import { CommentInputRow } from '@/components/CommentInputRow';

interface CommentsModalProps {
  visible: boolean;
  title: string;
  comments: Comment[];
  loading: boolean;
  submitting: boolean;
  newComment: string;
  onChangeComment: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  currentUserId?: string;
}

export function CommentsModal({
  visible,
  title,
  comments,
  loading,
  submitting,
  newComment,
  onChangeComment,
  onSubmit,
  onClose,
  currentUserId,
}: CommentsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              nestedScrollEnabled
            >
              {loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="small" color="#e50914" />
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-outline" size={48} color="#444" />
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySubtitle}>Be the first to comment!</Text>
                </View>
              ) : (
                <View style={styles.commentsList}>
                  {comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentMeta}>
                        {comment.userPhoto ? (
                          <Image source={{ uri: comment.userPhoto }} style={styles.avatar} />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={12} color="#888" />
                          </View>
                        )}
                        <Text style={styles.commentAuthor}>{comment.userName}</Text>
                        <Text style={styles.commentTime}>
                          {communityService.formatTimeAgo(comment.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {currentUserId && (
              <CommentInputRow
                value={newComment}
                onChangeText={onChangeComment}
                onSubmit={onSubmit}
                submitting={submitting}
                disabled={!newComment.trim()}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centered: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 13,
  },
  commentsList: {
    paddingVertical: 8,
  },
  commentItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAuthor: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  commentTime: {
    color: '#666',
    fontSize: 11,
  },
  commentContent: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 30,
  },
});
