import { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { communityService, Post, MediaItem } from '@/services/communityService';
import { CommunityPostVideo } from '@/components/CommunityPostVideo';
import { getSignedUrlWithAutoRenewal, getSignedUrl } from '@/services/uploadService';

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLike: (postId: string) => void;
  onComment: (post: Post) => void;
  onDelete?: (postId: string) => void;
  showMedia?: boolean;
}

function PostMediaItem({ mediaItem }: { mediaItem: MediaItem }) {
  const [url, setUrl] = useState(mediaItem.url);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (mediaItem.filePath) {
      getSignedUrlWithAutoRenewal(mediaItem.filePath)
        .then(setUrl)
        .catch(() => {});
    }
  }, [mediaItem.filePath]);

  const onError = useCallback(() => {
    if (mediaItem.filePath) {
      getSignedUrl(mediaItem.filePath)
        .then((fresh) => {
          setUrl(fresh);
          setRetryKey((k) => k + 1);
        })
        .catch(() => {});
    }
  }, [mediaItem.filePath]);

  if (mediaItem.type === 'video') {
    return <CommunityPostVideo key={retryKey} url={url} style={styles.mediaImage} />;
  }
  return <Image source={{ uri: url }} style={styles.mediaImage} resizeMode="cover" onError={onError} />;
}

export function PostCard({
  post,
  currentUserId,
  onLike,
  onComment,
  onDelete,
  showMedia = false,
}: PostCardProps) {
  const isLiked = currentUserId ? post.likes.includes(currentUserId) : false;
  const isOwner = currentUserId === post.userId;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.author}>
          {post.userPhoto ? (
            <Image source={{ uri: post.userPhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={16} color="#888" />
            </View>
          )}
          <View>
            <Text style={styles.authorName}>{post.userName}</Text>
            <Text style={styles.time}>{communityService.formatTimeAgo(post.createdAt)}</Text>
          </View>
        </View>
        {isOwner && onDelete && (
          <TouchableOpacity onPress={() => onDelete(post.id)}>
            <Ionicons name="trash-outline" size={18} color="#e50914" />
          </TouchableOpacity>
        )}
      </View>

      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      {showMedia && post.media && post.media.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.media.map((mediaItem, index) => (
            <View
              key={index}
              style={[
                styles.mediaItem,
                post.media!.length === 1 && styles.mediaItemSingle,
                post.media!.length === 2 && styles.mediaItemHalf,
                post.media!.length > 2 && styles.mediaItemQuarter,
              ]}
            >
              <PostMediaItem mediaItem={mediaItem} />
            </View>
          ))}
        </View>
      )}

      {post.animeName && (
        <View style={styles.animeTag}>
          <Ionicons name="film-outline" size={14} color="#e50914" />
          <Text style={styles.animeTagText}>{post.animeName}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onLike(post.id)}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={isLiked ? '#e50914' : '#888'}
          />
          <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
            {post.likes.length}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onComment(post)}>
          <Ionicons name="chatbubble-outline" size={18} color="#888" />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    color: '#888',
    fontSize: 11,
    marginTop: 1,
  },
  content: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  mediaItem: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  mediaItemSingle: {
    width: '100%',
    height: 200,
  },
  mediaItemHalf: {
    width: '48%',
    height: 150,
  },
  mediaItemQuarter: {
    width: '48%',
    height: 120,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  animeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  animeTagText: {
    color: '#e50914',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#888',
    fontSize: 13,
  },
  actionTextActive: {
    color: '#e50914',
  },
});
