import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Anime } from '../types';
import FeaturedAnime from './FeaturedAnime';

interface FeaturedCarouselProps {
  animes: Anime[];
  onPlay: (anime: Anime) => void;
  onInfo: (anime: Anime) => void;
}

const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ animes, onPlay, onInfo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollingRef = useRef(false);

  // Handle dimension changes (especially for web)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setContainerWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (animes.length > 1) {
      autoScrollTimer.current = setInterval(() => {
        if (!scrollingRef.current) {
          setCurrentIndex((prevIndex) => {
            const nextIndex = (prevIndex + 1) % animes.length;
            try {
              flatListRef.current?.scrollToIndex({ 
                index: nextIndex, 
                animated: true 
              });
            } catch (error) {
              // Fallback to scrollToOffset if scrollToIndex fails
              flatListRef.current?.scrollToOffset({
                offset: nextIndex * containerWidth,
                animated: true,
              });
            }
            return nextIndex;
          });
        }
      }, 5000);

      return () => {
        if (autoScrollTimer.current) {
          clearInterval(autoScrollTimer.current);
        }
      };
    }
  }, [animes.length, containerWidth]);

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / containerWidth);
    if (index !== currentIndex && index >= 0 && index < animes.length) {
      setCurrentIndex(index);
    }
  }, [containerWidth, currentIndex, animes.length]);

  const handleScrollBeginDrag = useCallback(() => {
    scrollingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    scrollingRef.current = false;
  }, []);

  const handleDotPress = useCallback((index: number) => {
    scrollingRef.current = true;
    try {
      flatListRef.current?.scrollToIndex({ index, animated: true });
    } catch (error) {
      flatListRef.current?.scrollToOffset({
        offset: index * containerWidth,
        animated: true,
      });
    }
    setCurrentIndex(index);
    setTimeout(() => {
      scrollingRef.current = false;
    }, 500);
  }, [containerWidth]);

  if (animes.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={animes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.carouselItem, { width: containerWidth }]}>
            <FeaturedAnime
              anime={item}
              onPlay={() => onPlay(item)}
              onInfo={() => onInfo(item)}
              width={containerWidth}
            />
          </View>
        )}
        getItemLayout={(data, index) => ({
          length: containerWidth,
          offset: containerWidth * index,
          index,
        })}
        initialScrollIndex={0}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: info.index * containerWidth,
              animated: false,
            });
          }, 100);
        }}
        decelerationRate="fast"
        snapToInterval={containerWidth}
        snapToAlignment="start"
        disableIntervalMomentum
      />
      
      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {animes.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive,
            ]}
            onPress={() => handleDotPress(index)}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#000',
  },
  carouselItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E50914',
    borderWidth: 0,
  },
});

export default FeaturedCarousel;

