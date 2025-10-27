import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Anime } from '../types';

interface FeaturedAnimeProps {
  anime: Anime;
  onPlay: () => void;
  onInfo: () => void;
  width: number;
}

const FeaturedAnime: React.FC<FeaturedAnimeProps> = ({ anime, onPlay, onInfo, width }) => {
  // Calculate responsive height based on width and platform
  const isWeb = Platform.OS === 'web';
  const isSmallScreen = width < 768;
  
  // Better height calculation for mobile vs web
  let height;
  if (isSmallScreen) {
    // Mobile: Use a ratio that prevents compression (16:9 to 3:2)
    height = Math.max(width * 0.65, 450); // Minimum 450px for mobile
  } else {
    // Web/Tablet: Use standard ratio with max height
    height = Math.min(width * 0.55, 600);
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Image
        source={{ uri: anime.bannerImage }}
        style={styles.bannerImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', '#000']}
        style={styles.gradient}
      >
        <View style={[
          styles.content, 
          isWeb && !isSmallScreen && styles.contentWeb,
          isSmallScreen && styles.contentMobile
        ]}>
          <Text 
            style={[styles.title, isSmallScreen && styles.titleSmall]} 
            numberOfLines={2}
          >
            {anime.title}
          </Text>
          <View style={styles.metaContainer}>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={isSmallScreen ? 14 : 16} color="#FFD700" />
              <Text style={styles.rating}>{anime.rating}</Text>
            </View>
            <Text style={styles.meta}>{anime.year}</Text>
            <Text style={styles.meta}>{anime.episodes} Episodes</Text>
          </View>
          <Text 
            style={[styles.description, isSmallScreen && styles.descriptionSmall]} 
            numberOfLines={isSmallScreen ? 2 : 3}
          >
            {anime.description}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.playButton} onPress={onPlay}>
              <MaterialIcons name="play-arrow" size={isSmallScreen ? 20 : 24} color="#000" />
              <Text style={[styles.playButtonText, isSmallScreen && styles.buttonTextSmall]}>
                Play
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoButton} onPress={onInfo}>
              <MaterialIcons name="info-outline" size={isSmallScreen ? 20 : 24} color="#fff" />
              <Text style={[styles.infoButtonText, isSmallScreen && styles.buttonTextSmall]}>
                More Info
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000',
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
    height: '70%',
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  contentWeb: {
    maxWidth: 800,
    marginLeft: 40,
    width: '100%',
  },
  contentMobile: {
    paddingHorizontal: 16,
    paddingBottom: 50,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'left',
    ...(Platform.OS === 'web' ? { textShadow: '0px 2px 4px rgba(0, 0, 0, 0.75)' } as any : {
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    }),
  },
  titleSmall: {
    fontSize: 26,
    marginBottom: 10,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rating: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  meta: {
    color: '#aaa',
    fontSize: 14,
    marginRight: 12,
  },
  description: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'left',
    ...(Platform.OS === 'web' ? { textShadow: '0px 1px 3px rgba(0, 0, 0, 0.75)' } as any : {
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    }),
  },
  descriptionSmall: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    maxWidth: 500,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 6,
    elevation: 5,
    ...(Platform.OS === 'web' ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)' } as any : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    }),
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  infoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  infoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  buttonTextSmall: {
    fontSize: 15,
    marginLeft: 5,
  },
});

export default FeaturedAnime;

