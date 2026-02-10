import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AnimeCard from '../components/AnimeCard';
import { useAnimeSearch } from '../hooks/useAnimeData';
import { fetchAnimeByGenre, fetchGenres, getPopularGenres, Genre } from '../services/metadataApi';
import { Anime } from '../types';
import { RootStackParamList } from '../navigation/types';

type SearchScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Search'>;
};

// Icon mapping for genres
const GENRE_ICONS: { [key: string]: string } = {
  'Action': 'flash-on',
  'Adventure': 'explore',
  'Comedy': 'sentiment-satisfied',
  'Drama': 'theater-comedy',
  'Fantasy': 'auto-fix-high',
  'Romance': 'favorite',
  'Sci-Fi': 'rocket-launch',
  'Horror': 'warning',
  'Mystery': 'help-outline',
  'Supernatural': 'auto-awesome',
  'Sports': 'sports-soccer',
  'Slice of Life': 'local-cafe',
  'Thriller': 'dangerous',
  'Mecha': 'precision-manufacturing',
};

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { loading, results, error, search } = useAnimeSearch();
  const [categoryAnime, setCategoryAnime] = useState<Anime[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Genre[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Fetch genres/categories from API on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const genres = await fetchGenres();
      // Filter to show only popular/featured genres with icons
      const popularGenres = genres.filter(genre => 
        GENRE_ICONS.hasOwnProperty(genre.name)
      ).slice(0, 12); // Show top 12 genres
      setCategories(popularGenres);
    } catch (err) {
      console.error('Error loading categories:', err);
      // Fallback to popular genres if API fails
      const fallback = getPopularGenres().map(g => ({
        mal_id: g.id,
        name: g.name,
        count: 0
      }));
      setCategories(fallback);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    if (debouncedSearchQuery) {
      search(debouncedSearchQuery);
      setSelectedCategory(null);
      setCategoryAnime([]);
    }
  }, [debouncedSearchQuery]);

  const handleCategoryPress = async (genre: Genre) => {
    setSelectedCategory(genre.name);
    setSearchQuery('');
    setCategoryLoading(true);
    
    try {
      const anime = await fetchAnimeByGenre(genre.mal_id, 1);
      setCategoryAnime(anime);
    } catch (err) {
      console.error('Error fetching category anime:', err);
    } finally {
      setCategoryLoading(false);
    }
  };

  const filteredAnime = selectedCategory ? categoryAnime : results;

  const handleAnimePress = (animeId: string) => {
    const anime = filteredAnime.find(a => a.id === animeId);
    console.log('SearchScreen - Navigating to anime:', animeId);
    console.log('SearchScreen - Found anime data:', anime ? anime.title : 'NOT FOUND');
    console.log('SearchScreen - Total anime in list:', filteredAnime.length);
    navigation.navigate('AnimeDetail', { animeId, anime });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={22} color="#aaa" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for anime, genres, studios..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <MaterialIcons name="close" size={20} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.length === 0 && !selectedCategory ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesHeader}>
            <MaterialIcons name="category" size={32} color="#E50914" />
            <Text style={styles.categoriesTitle}>Browse by Category</Text>
            <Text style={styles.categoriesSubtitle}>
              {categoriesLoading ? 'Loading categories...' : `${categories.length} genres available`}
            </Text>
          </View>

          {categoriesLoading ? (
            <View style={styles.categoriesLoadingContainer}>
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={styles.loadingText}>Loading genres from API...</Text>
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => {
                const icon = GENRE_ICONS[category.name] || 'category';
                return (
                  <TouchableOpacity
                    key={category.mal_id}
                    style={styles.categoryCard}
                    onPress={() => handleCategoryPress(category)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryIconContainer}>
                      <MaterialIcons name={icon as any} size={32} color="#E50914" />
                    </View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {category.count > 0 && (
                      <Text style={styles.categoryCount}>{category.count} anime</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.searchSuggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Popular Searches</Text>
            <View style={styles.suggestionTags}>
              {['Naruto', 'One Piece', 'Attack on Titan', 'Demon Slayer', 'Death Note'].map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.suggestionTag}
                  onPress={() => setSearchQuery(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : categoryLoading || loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={80} color="#E50914" />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : filteredAnime.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={80} color="#333" />
          <Text style={styles.emptyText}>
            {selectedCategory ? 'No anime found in this category' : `No results found for "${searchQuery}"`}
          </Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      ) : (
        <View style={styles.resultsContainer}>
          {selectedCategory && (
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryHeaderText}>
                {selectedCategory} Anime
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(null);
                  setCategoryAnime([]);
                }}
                style={styles.clearCategoryButton}
              >
                <MaterialIcons name="close" size={20} color="#E50914" />
                <Text style={styles.clearCategoryText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={filteredAnime}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                <AnimeCard
                  anime={item}
                  onPress={() => handleAnimePress(item.id)}
                  width={170}
                />
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  clearButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  gridContent: {
    paddingHorizontal: 16,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  categoriesHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  categoriesTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  categoriesSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 6,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  categoryCard: {
    width: '46%',
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 24,
    margin: '2%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }),
    elevation: 5,
  },
  categoryIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(229, 9, 20, 0.3)',
  },
  categoryName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  categoryCount: {
    color: '#777',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  categoriesLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 12,
  },
  searchSuggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    paddingBottom: 40,
  },
  suggestionsTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  suggestionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionTag: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#333',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  resultsContainer: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#141414',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#2a2a2a',
  },
  categoryHeaderText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  clearCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E50914',
  },
  clearCategoryText: {
    color: '#E50914',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default SearchScreen;

