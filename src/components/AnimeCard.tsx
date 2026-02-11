import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Anime } from '../types';
import { MaterialIcons } from '@expo/vector-icons';

interface AnimeCardProps {
  anime: Anime;
  onPress: () => void;
  width?: number;
  showTitle?: boolean;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ 
  anime, 
  onPress, 
  width = 140,
  showTitle = true 
}) => {
  return (
    <TouchableOpacity 
      style={[styles.container, { width }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: anime.coverImage }}
          style={[
            styles.image,
            { width, height: width * 1.5 },
            Platform.OS === 'web' ? {
              // Remove auto-applied left: 0px and top: 0px from React Native Web
              // Setting to undefined removes the property in React Native Web
              left: undefined as any,
              top: undefined as any,
              position: 'static' as any,
            } : {},
          ]}
          resizeMode="cover"
        />
        <View style={styles.ratingContainer}>
          <MaterialIcons name="star" size={12} color="#FFD700" />
          <Text style={styles.rating}>{anime.rating}</Text>
        </View>
      </View>
      {showTitle && (
        <Text style={styles.title} numberOfLines={2}>
          {anime.title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 8,
  },
  ratingContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rating: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    lineHeight: 17,
  },
});

export default AnimeCard;

