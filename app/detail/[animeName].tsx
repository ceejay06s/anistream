import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AnimeDetailScreen from '../../src/screens/AnimeDetailScreen';
import { getStringParam, useNavigationAdapter } from '../../src/utils/navigation';

const DetailRoute = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigationAdapter();
  const router = useRouter();

  // Priority: params.id (query param) > params.animeId (fallback)
  // Note: params.animeName is the slug from URL path, not an ID, but we can use it as fallback search query
  let animeId = getStringParam(params.id) || getStringParam(params.animeId);
  
  // Extract title for better searching when ID lookup fails
  // Priority: params.title (query param) > animeName slug
  let searchTitle: string | undefined = getStringParam(params.title);
  
  if (!searchTitle) {
    const animeNameSlug = getStringParam(params.animeName);
    if (animeNameSlug) {
      // Convert slug back to a searchable format (replace hyphens with spaces)
      searchTitle = animeNameSlug.replace(/-/g, ' ');
    }
  }
  
  // If no ID found, use the title as the search query
  if (!animeId && searchTitle) {
    animeId = searchTitle;
  }

  // Validate that we have an animeId before rendering the screen
  if (!animeId) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#E50914" />
        <Text style={styles.errorText}>Anime ID is missing</Text>
        <Text style={styles.errorSubtext}>
          Unable to load anime details without an ID.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const route = {
    params: {
      animeId,
      anime: undefined, // Always undefined - will fetch from API
      searchTitle, // Pass title for better searching when ID lookup fails
    },
  } as any;

  return <AnimeDetailScreen navigation={navigation as any} route={route} />;
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#E50914',
    borderRadius: 6,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DetailRoute;
