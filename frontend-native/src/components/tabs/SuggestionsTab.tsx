import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { AnimeInfo, RelatedAnime } from '@/services/api';
import { getProxiedImageUrl } from '@/utils/imageProxy';

interface Props {
  animeInfo: AnimeInfo;
  onAnimePress: (anime: RelatedAnime) => void;
}

export function SuggestionsTab({ animeInfo, onAnimePress }: Props) {
  const isEmpty =
    (!animeInfo.relatedAnime || animeInfo.relatedAnime.length === 0) &&
    (!animeInfo.recommendedAnime || animeInfo.recommendedAnime.length === 0) &&
    (!animeInfo.seasons || animeInfo.seasons.length === 0);

  return (
    <View style={styles.tabContent}>
      {animeInfo.seasons && animeInfo.seasons.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seasons</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS !== 'web'} style={styles.horizontalScroll}>
            <View style={styles.animeRow}>
              {animeInfo.seasons.map((anime, index) => (
                <TouchableOpacity key={index} style={styles.animeCard} onPress={() => onAnimePress(anime)}>
                  <Image source={{ uri: getProxiedImageUrl(anime.poster) || '' }} style={styles.animeCardImage} />
                  <Text style={styles.animeCardTitle} numberOfLines={2}>{anime.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {animeInfo.relatedAnime && animeInfo.relatedAnime.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Related Anime</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS !== 'web'} style={styles.horizontalScroll}>
            <View style={styles.animeRow}>
              {animeInfo.relatedAnime.map((anime, index) => (
                <TouchableOpacity key={index} style={styles.animeCard} onPress={() => onAnimePress(anime)}>
                  <Image source={{ uri: getProxiedImageUrl(anime.poster) || '' }} style={styles.animeCardImage} />
                  <Text style={styles.animeCardTitle} numberOfLines={2}>{anime.name}</Text>
                  {anime.type && <Text style={styles.animeCardType}>{anime.type}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {animeInfo.recommendedAnime && animeInfo.recommendedAnime.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS !== 'web'} style={styles.horizontalScroll}>
            <View style={styles.animeRow}>
              {animeInfo.recommendedAnime.map((anime, index) => (
                <TouchableOpacity key={index} style={styles.animeCard} onPress={() => onAnimePress(anime)}>
                  <Image source={{ uri: getProxiedImageUrl(anime.poster) || '' }} style={styles.animeCardImage} />
                  <Text style={styles.animeCardTitle} numberOfLines={2}>{anime.name}</Text>
                  {anime.type && <Text style={styles.animeCardType}>{anime.type}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {isEmpty && <Text style={styles.emptyText}>No suggestions available</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  horizontalScroll: {
    ...Platform.select({
      web: { overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'thin' } as any,
      default: {},
    }),
  },
  animeRow: { flexDirection: 'row', gap: 12, paddingRight: 16 },
  animeCard: { width: 120 },
  animeCardImage: { width: 120, height: 180, borderRadius: 8, backgroundColor: '#222', marginBottom: 8 },
  animeCardTitle: { color: '#fff', fontSize: 12, fontWeight: '500' },
  animeCardType: { color: '#666', fontSize: 10, marginTop: 2 },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center', padding: 20 },
});
