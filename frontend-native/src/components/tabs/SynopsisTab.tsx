import { View, Text, StyleSheet } from 'react-native';
import { AnimeInfo } from '@/services/api';

interface Props {
  animeInfo: AnimeInfo;
}

export function SynopsisTab({ animeInfo }: Props) {
  return (
    <View style={styles.tabContent}>
      {animeInfo.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synopsis</Text>
          <Text style={styles.description}>{animeInfo.description}</Text>
        </View>
      )}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailsGrid}>
          {animeInfo.japanese && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Japanese</Text>
              <Text style={styles.detailValue}>{animeInfo.japanese}</Text>
            </View>
          )}
          {animeInfo.status && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{animeInfo.status}</Text>
            </View>
          )}
          {animeInfo.aired && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Aired</Text>
              <Text style={styles.detailValue}>{animeInfo.aired}</Text>
            </View>
          )}
          {animeInfo.premiered && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Premiered</Text>
              <Text style={styles.detailValue}>{animeInfo.premiered}</Text>
            </View>
          )}
          {animeInfo.duration && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{animeInfo.duration}</Text>
            </View>
          )}
          {animeInfo.type && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{animeInfo.type}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  description: { fontSize: 14, color: '#aaa', lineHeight: 22 },
  detailsGrid: { gap: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  detailLabel: { color: '#888', fontSize: 14 },
  detailValue: { color: '#fff', fontSize: 14, flex: 1, textAlign: 'right', marginLeft: 16 },
});
