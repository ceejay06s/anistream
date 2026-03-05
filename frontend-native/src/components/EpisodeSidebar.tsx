import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Episode, AnimeInfo } from '@/services/api';

interface EpisodeSidebarProps {
  episodes: Episode[];
  episodesLoading: boolean;
  currentEpNumber: number;
  animeInfo: AnimeInfo | null;
  onEpisodeSelect: (episode: Episode) => void;
}

export function EpisodeSidebar({
  episodes,
  episodesLoading,
  currentEpNumber,
  animeInfo,
  onEpisodeSelect,
}: EpisodeSidebarProps) {
  const router = useRouter();

  // 5-episode sliding window centered on current episode
  const WINDOW = 5;
  const half = Math.floor(WINDOW / 2);
  const currentIndex = episodes.findIndex(ep => ep.number === currentEpNumber);
  let start = Math.max(0, currentIndex - half);
  let end = start + WINDOW;
  if (end > episodes.length) {
    end = episodes.length;
    start = Math.max(0, end - WINDOW);
  }
  const visibleEpisodes = episodes.slice(start, end);

  return (
    <>
      {/* Episode List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Episodes {episodes.length > 0 ? `(${currentEpNumber} / ${episodes.length})` : ''}
        </Text>
        {episodesLoading ? (
          <ActivityIndicator size="small" color="#e50914" />
        ) : (
          <View>
            {start > 0 && (
              <TouchableOpacity
                style={styles.windowNav}
                onPress={() => onEpisodeSelect(episodes[start - 1])}
              >
                <Ionicons name="chevron-up" size={14} color="#666" />
                <Text style={styles.windowNavText}>EP {episodes[start - 1].number}</Text>
              </TouchableOpacity>
            )}
            {visibleEpisodes.map((ep) => (
              <TouchableOpacity
                key={ep.episodeId}
                style={[styles.episodeItem, ep.number === currentEpNumber && styles.episodeItemActive]}
                onPress={() => onEpisodeSelect(ep)}
              >
                <Text
                  style={[styles.epNumber, ep.number === currentEpNumber && styles.epNumberActive]}
                >
                  EP {ep.number}
                </Text>
                {ep.title && (
                  <Text
                    style={[styles.epTitle, ep.number === currentEpNumber && styles.epTitleActive]}
                    numberOfLines={1}
                  >
                    {ep.title}
                  </Text>
                )}
                {ep.number === currentEpNumber && (
                  <Ionicons name="play-circle" size={20} color="#e50914" />
                )}
              </TouchableOpacity>
            ))}
            {end < episodes.length && (
              <TouchableOpacity
                style={styles.windowNav}
                onPress={() => onEpisodeSelect(episodes[end])}
              >
                <Text style={styles.windowNavText}>EP {episodes[end].number}</Text>
                <Ionicons name="chevron-down" size={14} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Related Anime */}
      {animeInfo?.relatedAnime && animeInfo.relatedAnime.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Related</Text>
          <ScrollView style={styles.relatedList} nestedScrollEnabled>
            {animeInfo.relatedAnime.slice(0, 10).map((related: any) => (
              <TouchableOpacity
                key={related.id}
                style={styles.relatedItem}
                onPress={() => router.push({ pathname: '/detail/[id]', params: { id: related.id } })}
              >
                {related.poster && (
                  <Image source={{ uri: related.poster }} style={styles.relatedPoster} />
                )}
                <View style={styles.relatedInfo}>
                  <Text style={styles.relatedTitle} numberOfLines={2}>{related.name}</Text>
                  {related.type && <Text style={styles.relatedType}>{related.type}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  windowNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  windowNavText: {
    color: '#666',
    fontSize: 12,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  episodeItemActive: {
    backgroundColor: '#1a0000',
  },
  epNumber: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
  },
  epNumberActive: {
    color: '#e50914',
  },
  epTitle: {
    color: '#aaa',
    fontSize: 12,
    flex: 1,
  },
  epTitleActive: {
    color: '#fff',
  },
  relatedList: {
    maxHeight: 300,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  relatedPoster: {
    width: 40,
    height: 56,
    borderRadius: 3,
    backgroundColor: '#222',
  },
  relatedInfo: {
    flex: 1,
  },
  relatedTitle: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
  },
  relatedType: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
});
