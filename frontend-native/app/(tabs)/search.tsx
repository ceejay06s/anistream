import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { animeApi, Anime } from '@/services/api';
import {
  filterOptions,
  filterDisplayNames,
  genres,
  capitalizeGenre,
  FilterType,
  FilterStatus,
  FilterSeason,
  FilterLanguage,
  FilterSort,
  Genre,
} from '@/data/meta';

interface Filters {
  type: FilterType;
  status: FilterStatus;
  season: FilterSeason;
  language: FilterLanguage;
  sort: FilterSort;
  genres: Genre[];
}

const defaultFilters: Filters = {
  type: 'all',
  status: 'all',
  season: 'all',
  language: 'all',
  sort: 'default',
  genres: [],
};

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showGenreModal, setShowGenreModal] = useState(false);

  const hasActiveFilters = () => {
    return (
      filters.type !== 'all' ||
      filters.status !== 'all' ||
      filters.season !== 'all' ||
      filters.language !== 'all' ||
      filters.sort !== 'default' ||
      filters.genres.length > 0
    );
  };

  const handleSearch = async () => {
    if (!query.trim() && !hasActiveFilters()) return;

    try {
      setLoading(true);
      setSearched(true);

      // Build filter params
      const filterParams: Record<string, string> = {};
      if (filters.type !== 'all') filterParams.type = filters.type;
      if (filters.status !== 'all') filterParams.status = filters.status;
      if (filters.season !== 'all') filterParams.season = filters.season;
      if (filters.language !== 'all') filterParams.language = filters.language;
      if (filters.sort !== 'default') filterParams.sort = filters.sort;
      if (filters.genres.length > 0) filterParams.genres = filters.genres.join(',');

      const data = await animeApi.searchWithFilters(query.trim(), filterParams);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimePress = (anime: Anime) => {
    router.push({
      pathname: '/detail/[id]',
      params: { id: anime.id },
    });
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const toggleGenre = (genre: Genre) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const renderAnimeItem = ({ item }: { item: Anime }) => (
    <TouchableOpacity
      style={styles.animeItem}
      onPress={() => handleAnimePress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.poster }}
        style={styles.animePoster}
        resizeMode="cover"
      />
      <View style={styles.animeInfo}>
        <Text style={styles.animeTitle} numberOfLines={2}>
          {item.name}
        </Text>
        {item.type && <Text style={styles.animeType}>{item.type}</Text>}
        {item.rating && <Text style={styles.animeRating}>★ {item.rating}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderFilterOption = <T extends string>(
    label: string,
    options: readonly T[],
    displayNames: Record<T, string>,
    value: T,
    onChange: (val: T) => void
  ) => (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterOptions}
      >
        {options.map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.filterChip,
              value === option && styles.filterChipActive,
            ]}
            onPress={() => onChange(option)}
          >
            <Text
              style={[
                styles.filterChipText,
                value === option && styles.filterChipTextActive,
              ]}
            >
              {displayNames[option]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderGenreModal = () => (
    <Modal
      visible={showGenreModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowGenreModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Genres</Text>
            <TouchableOpacity onPress={() => setShowGenreModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.genreList}>
            <View style={styles.genreGrid}>
              {genres.map(genre => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreChip,
                    filters.genres.includes(genre) && styles.genreChipActive,
                  ]}
                  onPress={() => toggleGenre(genre)}
                >
                  <Text
                    style={[
                      styles.genreChipText,
                      filters.genres.includes(genre) && styles.genreChipTextActive,
                    ]}
                  >
                    {capitalizeGenre(genre)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={styles.modalDoneButton}
            onPress={() => setShowGenreModal(false)}
          >
            <Text style={styles.modalDoneText}>Done ({filters.genres.length} selected)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anime..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={hasActiveFilters() ? '#fff' : '#888'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.searchButton, (query.trim() || hasActiveFilters()) && styles.searchButtonReady]}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>
            {hasActiveFilters() && !query.trim() ? 'Filter' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filters</Text>
            {hasActiveFilters() && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {renderFilterOption(
            'Type',
            filterOptions.type,
            filterDisplayNames.type,
            filters.type,
            (val) => setFilters(prev => ({ ...prev, type: val }))
          )}

          {renderFilterOption(
            'Status',
            filterOptions.status,
            filterDisplayNames.status,
            filters.status,
            (val) => setFilters(prev => ({ ...prev, status: val }))
          )}

          {renderFilterOption(
            'Season',
            filterOptions.season,
            filterDisplayNames.season,
            filters.season,
            (val) => setFilters(prev => ({ ...prev, season: val }))
          )}

          {renderFilterOption(
            'Language',
            filterOptions.language,
            filterDisplayNames.language,
            filters.language,
            (val) => setFilters(prev => ({ ...prev, language: val }))
          )}

          {renderFilterOption(
            'Sort By',
            filterOptions.sort,
            filterDisplayNames.sort,
            filters.sort,
            (val) => setFilters(prev => ({ ...prev, sort: val }))
          )}

          {/* Genres */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Genres</Text>
            <TouchableOpacity
              style={styles.genreSelector}
              onPress={() => setShowGenreModal(true)}
            >
              <Text style={styles.genreSelectorText}>
                {filters.genres.length > 0
                  ? `${filters.genres.length} selected`
                  : 'Select genres'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#888" />
            </TouchableOpacity>
          </View>

          {filters.genres.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectedGenres}
              contentContainerStyle={styles.selectedGenresContent}
            >
              {filters.genres.map(genre => (
                <TouchableOpacity
                  key={genre}
                  style={styles.selectedGenreChip}
                  onPress={() => toggleGenre(genre)}
                >
                  <Text style={styles.selectedGenreText}>{capitalizeGenre(genre)}</Text>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color="#444" />
          <Text style={styles.noResultsText}>No results found</Text>
          <Text style={styles.noResultsHint}>Try different keywords or filters</Text>
        </View>
      ) : !searched ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color="#444" />
          <Text style={styles.noResultsText}>Search for anime</Text>
          <Text style={styles.noResultsHint}>
            {hasActiveFilters()
              ? 'Click Filter to search with current filters'
              : 'Enter a title or use filters'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderAnimeItem}
          keyExtractor={(item) => item.id}
          numColumns={Platform.OS === 'web' ? 6 : 2}
          key={Platform.OS === 'web' ? 'web-6' : 'native-2'}
          contentContainerStyle={styles.animeGrid}
          columnWrapperStyle={styles.animeRow}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>{results.length} results</Text>
          }
        />
      )}

      {renderGenreModal()}
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
  header: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 16,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#222',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#e50914',
  },
  searchButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonReady: {
    backgroundColor: '#e50914',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filtersTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearFiltersText: {
    color: '#e50914',
    fontSize: 13,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  filterOptions: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#222',
  },
  filterChipActive: {
    backgroundColor: '#e50914',
  },
  filterChipText: {
    color: '#888',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  genreSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  genreSelectorText: {
    color: '#888',
    fontSize: 14,
  },
  selectedGenres: {
    marginTop: -4,
    marginBottom: 8,
  },
  selectedGenresContent: {
    gap: 6,
  },
  selectedGenreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  selectedGenreText: {
    color: '#fff',
    fontSize: 12,
  },
  resultsCount: {
    color: '#888',
    fontSize: 13,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  noResultsText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  noResultsHint: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
  animeGrid: {
    padding: 8,
  },
  animeRow: {
    justifyContent: 'space-between',
  },
  animeItem: {
    width: Platform.OS === 'web' ? '15.5%' : '48%',
    marginBottom: 12,
    backgroundColor: 'transparent',
    borderRadius: 4,
    overflow: 'hidden',
  },
  animePoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  animeInfo: {
    padding: 8,
  },
  animeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  animeType: {
    fontSize: 12,
    color: '#888',
  },
  animeRating: {
    fontSize: 12,
    color: '#ffc107',
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  genreList: {
    padding: 16,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#222',
  },
  genreChipActive: {
    backgroundColor: '#e50914',
  },
  genreChipText: {
    color: '#888',
    fontSize: 13,
  },
  genreChipTextActive: {
    color: '#fff',
  },
  modalDoneButton: {
    backgroundColor: '#e50914',
    margin: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
