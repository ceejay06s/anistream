import React from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator, Text, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeaturedCarousel from '../components/FeaturedCarousel';
import CategoryRow from '../components/CategoryRow';
import Header from '../components/Header';
import { useAnimeData } from '../hooks/useAnimeData';
import { Anime } from '../types';
import { RootStackParamList } from '../navigation/types';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { loading, error, categories, trendingAnime, latestAnime, refresh } = useAnimeData();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Use top 5 trending anime for carousel
  const featuredAnimes = trendingAnime.slice(0, 5);

  const handleAnimePress = (animeId: string) => {
    const anime = [...trendingAnime, ...latestAnime, ...categories.flatMap(c => c.animes)].find(a => a.id === animeId);
    console.log('HomeScreen - Navigating to anime:', animeId);
    console.log('HomeScreen - Found anime data:', anime ? anime.title : 'NOT FOUND');
    navigation.navigate('AnimeDetail', { animeId, anime });
  };

  const handleCarouselPlay = (anime: Anime) => {
    // Navigate to detail screen first to load episodes properly
    navigation.navigate('AnimeDetail', { animeId: anime.id, anime });
  };

  const handleCarouselInfo = (anime: Anime) => {
    navigation.navigate('AnimeDetail', { animeId: anime.id, anime });
  };

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header showLogo onSearchPress={handleSearchPress} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading anime data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header showLogo onSearchPress={handleSearchPress} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText} onPress={refresh}>
            Tap to retry
          </Text>
        </View>
      </View>
    );
  }

  if (featuredAnimes.length === 0 || categories.length === 0) {
    return (
      <View style={styles.container}>
        <Header showLogo onSearchPress={handleSearchPress} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No anime data available</Text>
          <Text style={styles.retryText} onPress={refresh}>
            Tap to retry
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showLogo onSearchPress={handleSearchPress} />
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E50914"
            colors={['#E50914']}
          />
        }
      >
        <FeaturedCarousel
          animes={featuredAnimes}
          onPlay={handleCarouselPlay}
          onInfo={handleCarouselInfo}
        />
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onAnimePress={handleAnimePress}
            />
          ))}
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
  scrollView: {
    flex: 1,
  },
  categoriesContainer: {
    paddingVertical: 20,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryText: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;

