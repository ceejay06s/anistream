import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimeInfo } from '@/services/api';
import { getProxiedImageUrl } from '@/utils/imageProxy';

interface Props {
  animeInfo: AnimeInfo;
}

export function CastTab({ animeInfo }: Props) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Actors</Text>
        {animeInfo.characters && animeInfo.characters.length > 0 ? (
          <View style={styles.castGrid}>
            {animeInfo.characters.map((cv, index) => (
              <View key={`${cv.character.id || cv.character.name || 'character'}-${index}`} style={styles.castItem}>
                <View style={styles.castRow}>
                  <View style={styles.castPerson}>
                    <Image
                      source={{ uri: getProxiedImageUrl(cv.character.poster) || 'https://via.placeholder.com/60' }}
                      style={styles.castImage}
                    />
                    <Text style={styles.castName} numberOfLines={2}>
                      {cv.character.name || 'Unknown Character'}
                    </Text>
                    <Text style={styles.castRole}>Character</Text>
                  </View>
                  <View style={styles.castConnector}>
                    <Ionicons name="arrow-forward" size={16} color="#666" />
                  </View>
                  <View style={styles.castPerson}>
                    <Image
                      source={{ uri: getProxiedImageUrl(cv.voiceActor.poster) || 'https://via.placeholder.com/60' }}
                      style={styles.castImage}
                    />
                    <Text style={styles.castName} numberOfLines={2}>
                      {cv.voiceActor.name || 'Unknown Voice Actor'}
                    </Text>
                    <Text style={styles.castRole}>Voice Actor</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No voice actor information available</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  castGrid: { gap: 16 },
  castItem: { backgroundColor: '#111', borderRadius: 8, padding: 12 },
  castRow: { flexDirection: 'row', alignItems: 'center' },
  castPerson: { flex: 1, alignItems: 'center' },
  castConnector: { paddingHorizontal: 8 },
  castImage: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#222', marginBottom: 8 },
  castName: { color: '#fff', fontSize: 12, textAlign: 'center', fontWeight: '500' },
  castRole: { color: '#666', fontSize: 10, textAlign: 'center', marginTop: 2 },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center', padding: 20 },
});
