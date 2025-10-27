import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AnimeCard from '../components/AnimeCard';
import { fetchTopAnime, fetchAnimeByGenre, fetchGenres, Genre } from '../services/api';
import { Anime } from '../types';
import { RootStackParamList } from '../navigation/types';

type BrowseScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Browse'>;
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

const BrowseScreen: React.FC<BrowseScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState(true);

  // Fetch genres from API on mount
  useEffect(() => {
    loadGenres();
    loadAnime();
  }, []);

  const loadGenres = async () => {
    setGenresLoading(true);
    try {
      const apiGenres = await fetchGenres();
      // Filter to show popular genres with icons
      const popularGenres = apiGenres.filter(genre => 
        GENRE_ICONS.hasOwnProperty(genre.name)
      );
      // Add "All" option at the beginning
      setGenres([
        { mal_id: 0, name: 'All', count: 0 },
        ...popularGenres.slice(0, 15) // Show top 15 genres
      ]);
    } catch (error) {
      console.error('Error loading genres:', error);
      // Fallback genres if API fails
      setGenres([
        { mal_id: 0, name: 'All', count: 0 },
        { mal_id: 1, name: 'Action', count: 0 },
        { mal_id: 2, name: 'Adventure', count: 0 },
        { mal_id: 4, name: 'Comedy', count: 0 },
      ]);
    } finally {
      setGenresLoading(false);
    }
  };

  const loadAnime = async () => {
    setLoading(true);
    try {
      const anime = await fetchTopAnime(1, 25);
      setAnimeList(anime);
    } catch (error) {
      console.error('Error loading anime:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnimeByGenre = async (genre: Genre) => {
    setLoading(true);
    try {
      const anime = await fetchAnimeByGenre(genre.mal_id, 1);
      setAnimeList(anime);
    } catch (error) {
      console.error('Error loading genre anime:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenrePress = (genre: Genre) => {
    setSelectedGenre(genre);
    if (genre.mal_id === 0) {
      loadAnime();
    } else {
      loadAnimeByGenre(genre);
    }
  };

  const filteredAnime = animeList;

  const handleAnimePress = (animeId: string) => {
    const anime = animeList.find(a => a.id === animeId);
    console.log('BrowseScreen - Navigating to anime:', animeId);
    console.log('BrowseScreen - Found anime data:', anime ? anime.title : 'NOT FOUND');
    console.log('BrowseScreen - Total anime in list:', animeList.length);
    navigation.navigate('AnimeDetail', { animeId, anime });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse</Text>
        <Text style={styles.subtitle}>
          {selectedGenre?.name || 'All Anime'} {selectedGenre?.mal_id === 0 ? '• Top Rated' : ''}
        </Text>
        <View style={styles.statsContainer}>
          <MaterialIcons name="movie" size={16} color="#E50914" />
          <Text style={styles.statsText}>{filteredAnime.length} titles available</Text>
        </View>
      </View>
      
      {genresLoading ? (
        <View style={styles.genresLoadingContainer}>
          <ActivityIndicator size="small" color="#E50914" />
          <Text style={styles.genresLoadingText}>Loading genres...</Text>
        </View>
      ) : (
        <View style={styles.genreScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.genreScroll}
            contentContainerStyle={styles.genreScrollContent}
          >
            {genres.map((genre) => {
              const isActive = selectedGenre?.mal_id === genre.mal_id || (!selectedGenre && genre.mal_id === 0);
              const icon = genre.name === 'All' ? 'apps' : (GENRE_ICONS[genre.name] || 'category');
              return (
                <TouchableOpacity
                  key={genre.mal_id}
                  style={[
                    styles.genrePill,
                    isActive && styles.genrePillActive,
                  ]}
                  onPress={() => handleGenrePress(genre)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name={icon as any} 
                    size={18} 
                    color={isActive ? '#fff' : '#aaa'}
                    style={styles.genreIcon}
                  />
                  <Text
                    style={[
                      styles.genreText,
                      isActive && styles.genreTextActive,
                    ]}
                  >
                    {genre.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading anime...</Text>
        </View>
      ) : filteredAnime.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={80} color="#333" />
          <Text style={styles.emptyText}>No anime found</Text>
        </View>
      ) : (
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statsText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  genreScrollWrapper: {
    marginVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  genreScroll: {
    maxHeight: 64,
  },
  genreScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  genrePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 28,
    backgroundColor: '#141414',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    minHeight: 44,
  },
  genrePillActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
    transform: [{ scale: 1.05 }],
    elevation: 8,
    ...(Platform.OS === 'web' ? { boxShadow: '0px 4px 8px rgba(229, 9, 20, 0.4)' } as any : {
      shadowColor: '#E50914',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    }),
  },
  genreIcon: {
    marginRight: 8,
  },
  genreText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  genreTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 15,
    marginTop: 20,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyText: {
    color: '#777',
    fontSize: 16,
    marginTop: 20,
    fontWeight: '600',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  genresLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1a1a1a',
  },
  genresLoadingText: {
    color: '#aaa',
    fontSize: 13,
    marginLeft: 12,
    fontWeight: '600',
  },
});

export default BrowseScreen;

