import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimeInfo } from '@/services/api';

interface Props {
  animeInfo: AnimeInfo;
}

export function StudioTab({ animeInfo }: Props) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Studios</Text>
        {animeInfo.studios && animeInfo.studios.length > 0 ? (
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

      {animeInfo.producers && animeInfo.producers.length > 0 && (
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
}

const styles = StyleSheet.create({
  tabContent: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  studioList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  studioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  studioName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  producerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  producerChip: { backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  producerName: { color: '#aaa', fontSize: 12 },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center', padding: 20 },
});
