import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Category } from '../types';
import AnimeCard from './AnimeCard';

interface CategoryRowProps {
  category: Category;
  onAnimePress: (animeId: string) => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ category, onAnimePress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.categoryTitle}>{category.name}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {category.animes.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            onPress={() => onAnimePress(anime.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
});

export default CategoryRow;

