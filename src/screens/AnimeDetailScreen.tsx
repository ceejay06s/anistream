import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchAnimeById } from '../services/api';
import { getAnimeStreamingInfo, Episode, searchAnimeForStreaming } from '../services/streamingApi';
import { Anime } from '../types';
import { RootStackParamList } from '../navigation/types';

type AnimeDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AnimeDetail'>;
  route: RouteProp<RootStackParamList, 'AnimeDetail'>;
};

const { width } = Dimensions.get('window');

const AnimeDetailScreen: React.FC<AnimeDetailScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { animeId, anime: passedAnime } = route.params;
  const [anime, setAnime] = useState<Anime | null>(passedAnime || null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(!passedAnime);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('=== AnimeDetailScreen Debug ===');
    console.log('Anime ID:', animeId);
    console.log('Passed Anime:', passedAnime ? passedAnime.title : 'NO DATA PASSED');
    console.log('Current anime state:', anime ? anime.title : 'null');
    console.log('Loading state:', loading);
    
    // Only fetch if anime data wasn't passed
    if (!passedAnime) {
      console.log('No passed data - fetching from API...');
      loadAnimeDetails();
    } else {
      console.log('Using passed anime data - no API call needed!');
    }
    
    // Always fetch episodes from Animeflix
    loadEpisodes();
  }, [animeId, passedAnime]);

  const loadAnimeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching anime details for ID:', animeId);
      const data = await fetchAnimeById(animeId);
      if (data) {
        console.log('Anime data loaded:', data.title);
        setAnime(data);
      } else {
        console.warn('No anime data returned from API');
        // If we had passed data, keep using it
        if (passedAnime) {
          console.log('Using passed anime data instead:', passedAnime.title);
          setAnime(passedAnime);
          setError(null);
        } else {
          setError('Anime not found. This anime may not be available in the database.');
        }
      }
    } catch (err: any) {
      console.error('Error loading anime details:', err);
      // If we had passed data, keep using it even if API fails
      if (passedAnime) {
        console.log('API failed, using passed anime data:', passedAnime.title);
        setAnime(passedAnime);
        setError(null);
      } else {
        setError(err?.message || 'Failed to load anime details. The anime may not exist or the API is unavailable.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodes = async () => {
    setLoadingEpisodes(true);
    try {
      if (!anime) {
        console.warn('No anime data available');
        setEpisodes([]);
        setLoadingEpisodes(false);
        return;
      }

      console.log('Searching for streaming sources:', anime.title);
      
      // Search for anime (tries AniWatch, then Shafilm, then GoGoAnime)
      const searchResults = await searchAnimeForStreaming(anime.title);
      
      if (searchResults.length === 0) {
        console.warn('No streaming sources found for:', anime.title);
        setEpisodes([]);
        setLoadingEpisodes(false);
        return;
      }

      // Use the first result (best match)
      const streamingAnime = searchResults[0];
      console.log('Found on:', streamingAnime.source, 'Title:', streamingAnime.title, 'ID:', streamingAnime.id);
      
      // Now fetch episodes using the source-specific ID
      const streamingInfo = await getAnimeStreamingInfo(streamingAnime.id, streamingAnime.source);
      
      if (streamingInfo && streamingInfo.episodes.length > 0) {
        console.log(`Loaded ${streamingInfo.episodes.length} episodes from ${streamingAnime.source}`);
        setEpisodes(streamingInfo.episodes);
      } else {
        console.warn(`No episodes found on ${streamingAnime.source}`);
        setEpisodes([]);
      }
    } catch (err) {
      console.error('Error loading episodes:', err);
      setEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading anime details...</Text>
        </View>
      </View>
    );
  }

  if (error || (!anime && !loading)) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={80} color="#E50914" />
          <Text style={styles.errorText}>{error || 'Anime not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAnimeDetails}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButtonBottom} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!anime) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading anime details...</Text>
        </View>
      </View>
    );
  }

  const handlePlayPress = () => {
    const firstEpisode = episodes[0];
    if (firstEpisode) {
      navigation.navigate('VideoPlayer', { 
        animeId: anime.id, 
        episodeId: firstEpisode.id,
        animeTitle: anime.title,
        episodeNumber: firstEpisode.number,
        episodeUrl: firstEpisode.url
      });
    } else {
      console.warn('No episodes available');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: anime.bannerImage }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', '#000']}
            style={styles.gradient}
          />
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{anime.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={18} color="#FFD700" />
              <Text style={styles.rating}>{anime.rating}</Text>
            </View>
            <Text style={styles.meta}>{anime.year}</Text>
            <Text style={styles.meta}>{anime.status}</Text>
            <Text style={styles.meta}>{anime.episodes} Episodes</Text>
          </View>

          <TouchableOpacity style={styles.playButton} onPress={handlePlayPress}>
            <MaterialIcons name="play-arrow" size={28} color="#000" />
            <Text style={styles.playButtonText}>Play Episode 1</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.actionText}>My List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="thumb-up" size={24} color="#fff" />
              <Text style={styles.actionText}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="share" size={24} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>{anime.description}</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Studio:</Text>
              <Text style={styles.infoValue}>{anime.studio}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Genres:</Text>
              <Text style={styles.infoValue}>{anime.genres.join(', ')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{anime.duration} per episode</Text>
            </View>
          </View>

          <View style={styles.episodesSection}>
            <Text style={styles.sectionTitle}>Episodes</Text>
            {loadingEpisodes ? (
              <View style={styles.episodesLoading}>
                <ActivityIndicator size="small" color="#E50914" />
                <Text style={styles.episodesLoadingText}>Loading episodes...</Text>
              </View>
            ) : episodes.length > 0 ? (
              episodes.slice(0, 20).map((episode) => (
                <TouchableOpacity
                  key={episode.id}
                  style={styles.episodeItem}
                  onPress={() => navigation.navigate('VideoPlayer', { 
                    animeId: anime.id, 
                    episodeId: episode.id,
                    animeTitle: anime.title,
                    episodeNumber: episode.number,
                    episodeUrl: episode.url
                  })}
                >
                  <Image
                    source={{ uri: episode.image || anime.coverImage }}
                    style={styles.episodeThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.episodeInfo}>
                    <Text style={styles.episodeTitle}>{episode.title || `Episode ${episode.number}`}</Text>
                    <Text style={styles.episodeDuration}>{episode.description || anime.duration}</Text>
                  </View>
                  <MaterialIcons name="play-circle-outline" size={32} color="#fff" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noEpisodesText}>No episodes available</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bannerContainer: {
    width: width,
    height: 400,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rating: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  meta: {
    color: '#aaa',
    fontSize: 14,
    marginRight: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 6,
    marginBottom: 20,
  },
  playButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 6,
  },
  description: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#aaa',
    fontSize: 14,
    width: 80,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  episodesSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
  },
  episodeThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 6,
  },
  episodeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeDuration: {
    color: '#aaa',
    fontSize: 13,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 24,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButtonBottom: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  episodesLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  episodesLoadingText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
  },
  noEpisodesText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default AnimeDetailScreen;

