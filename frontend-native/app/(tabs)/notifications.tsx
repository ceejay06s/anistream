import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  userNotificationService,
  UserNotification,
  NotificationType,
} from '@/services/userNotificationService';

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  post_anime_interest: { icon: 'film-outline', color: '#e50914' },
  comment_on_post: { icon: 'chatbubble-outline', color: '#46d369' },
  comment_on_commented_post: { icon: 'chatbubbles-outline', color: '#46d369' },
  anime_new_episode: { icon: 'play-circle-outline', color: '#e50914' },
  anime_new_season: { icon: 'calendar-outline', color: '#ffc107' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = userNotificationService.subscribeToNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user || markingAll) return;
    setMarkingAll(true);
    await userNotificationService.markAllAsRead(user.uid);
    setMarkingAll(false);
  }, [user, markingAll]);

  const handleNotificationPress = useCallback(
    (item: UserNotification) => {
      if (!item.read) {
        // Optimistically mark read in local state for instant visual feedback
        setNotifications(prev =>
          prev.map(n => n.id === item.id ? { ...n, read: true } : n)
        );
        userNotificationService.markAsRead(item.id);
      }
      if (item.data?.animeId) {
        router.push({ pathname: '/detail/[id]', params: { id: item.data.animeId } });
      } else if (item.data?.postId) {
        router.push('/(tabs)/community');
      }
    },
    [router]
  );

  const handleDelete = useCallback(async (notificationId: string) => {
    await userNotificationService.deleteNotification(notificationId);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderItem = useCallback(({ item }: { item: UserNotification }) => {
    const config = TYPE_CONFIG[item.type] ?? { icon: 'notifications-outline', color: '#888' };

    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.75}
      >
        {/* Left: actor photo or type icon */}
        <View style={[styles.iconWrap, { backgroundColor: config.color + '22' }]}>
          {item.data?.actorPhoto ? (
            <Image source={{ uri: item.data.actorPhoto }} style={styles.actorPhoto} />
          ) : (
            <Ionicons name={config.icon} size={22} color={config.color} />
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>
            {userNotificationService.formatTimeAgo(item.createdAt)}
          </Text>
        </View>

        {/* Right side: unread dot + delete */}
        <View style={styles.rightCol}>
          {!item.read && <View style={styles.unreadDot} />}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color="#555" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [handleNotificationPress, handleDelete]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={64} color="#444" />
          <Text style={styles.emptyTitle}>Sign in for Notifications</Text>
          <Text style={styles.emptySubtext}>
            Sign in to receive notifications about new episodes and community activity.
          </Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color="#888" />
          ) : (
            <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
              Mark all read
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-outline" size={64} color="#444" />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtext}>
            You have no notifications yet. Come back later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={15}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  markAllText: {
    color: '#e50914',
    fontSize: 13,
    fontWeight: '500',
  },
  markAllTextDisabled: {
    color: '#444',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  signInBtn: {
    backgroundColor: '#e50914',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginLeft: 72,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  cardUnread: {
    backgroundColor: 'rgba(229, 9, 20, 0.05)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  actorPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  body: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
  },
  time: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e50914',
  },
  deleteBtn: {
    padding: 2,
  },
});
