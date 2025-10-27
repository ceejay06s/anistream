import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { getStreamingSources, getRecommendedSource, StreamingSource } from '../services/streamingApi';
// Using Consumet HTTP API for better reliability (works with React Native)
import { getConsumetEpisodeSources, ConsumetProvider } from '../services/consumetApiService';

type VideoPlayerScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'VideoPlayer'>;
  route: RouteProp<RootStackParamList, 'VideoPlayer'>;
};

const { width, height } = Dimensions.get('window');

const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { 
    animeId, 
    episodeId, 
    animeTitle, 
    episodeNumber,
    episodeUrl
  } = route.params;
  
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [availableSources, setAvailableSources] = useState<StreamingSource[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [detectedSource, setDetectedSource] = useState<string>('Unknown');
  
  // Detect source from episode URL
  useEffect(() => {
    if (episodeUrl) {
      if (episodeUrl.includes('aniwatchtv.to')) {
        setDetectedSource('AniWatch');
      } else if (episodeUrl.includes('shafilm.vip')) {
        setDetectedSource('Shafilm');
      } else if (episodeUrl.includes('gogoanime') || episodeUrl.includes('anitaku.pe')) {
        setDetectedSource('GoGoAnime');
      } else {
        setDetectedSource('Streaming');
      }
    }
  }, [episodeUrl]);

  useEffect(() => {
    loadStreamingSources();
  }, [episodeId, episodeUrl]);

  const loadStreamingSources = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('=== Loading Streaming Sources with Consumet ===');
      console.log('Episode ID:', episodeId);
      console.log('Episode URL:', episodeUrl);

      // Try Consumet first (most reliable)
      let sources: any[] = [];

      try {
        console.log('🔄 Trying Consumet GoGoAnime...');
        const consumetData = await getConsumetEpisodeSources(episodeId, ConsumetProvider.GOGOANIME);

        if (consumetData && consumetData.sources && consumetData.sources.length > 0) {
          console.log(`✅ Found ${consumetData.sources.length} sources from Consumet GoGoAnime`);
          sources = consumetData.sources.map((s: any) => ({
            url: s.url,
            quality: s.quality || 'auto',
            isM3U8: s.isM3U8 || s.url.includes('.m3u8'),
          }));
        }
      } catch (consumetError) {
        console.log('⚠️ Consumet GoGoAnime failed, trying Zoro...');

        try {
          const zoroData = await getConsumetEpisodeSources(episodeId, ConsumetProvider.ZORO);
          if (zoroData && zoroData.sources && zoroData.sources.length > 0) {
            console.log(`✅ Found ${zoroData.sources.length} sources from Consumet Zoro`);
            sources = zoroData.sources.map((s: any) => ({
              url: s.url,
              quality: s.quality || 'auto',
              isM3U8: s.isM3U8 || s.url.includes('.m3u8'),
            }));
          }
        } catch (zoroError) {
          console.log('⚠️ Consumet Zoro failed, trying old API...');
        }
      }

      // Fallback to old API if Consumet fails
      if (sources.length === 0) {
        console.log('🔄 Falling back to old API...');
        const streamingData = await getStreamingSources(
          episodeId,
          undefined,
          undefined,
          undefined,
          undefined,
          episodeUrl
        );

        if (streamingData && streamingData.sources) {
          sources = streamingData.sources;
        }
      }

      if (sources.length === 0) {
        console.error('❌ No streaming sources returned from any provider');
        setError('No streaming sources available. Try a different episode or anime.');
        setLoading(false);
        return;
      }

      console.log(`✅ Total sources found: ${sources.length}`);
      sources.forEach((s, i) => {
        console.log(`Source ${i + 1}: ${s.quality} - ${s.url.substring(0, 50)}...`);
      });

      setAvailableSources(sources);

      // Get recommended quality source
      const recommendedSource = getRecommendedSource(sources);

      if (recommendedSource) {
        console.log('✅ Selected source:', recommendedSource.quality);
        setVideoSource(recommendedSource.url);
        setSelectedQuality(recommendedSource.quality);
        setIsPlaying(true);
      } else {
        console.error('❌ No suitable source found');
        setError('Could not find a suitable video source');
      }
    } catch (err) {
      console.error('❌ Error loading streaming sources:', err);
      setError(`Failed to load video: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const changeQuality = (source: StreamingSource) => {
    setVideoSource(source.url);
    setSelectedQuality(source.quality);
    setIsPlaying(true);
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
          <Text style={styles.loadingText}>Loading video from {detectedSource}...</Text>
        </View>
      </View>
    );
  }

  if (error || !videoSource) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={80} color="#E50914" />
          <Text style={styles.errorText}>{error || 'Video not available'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadStreamingSources}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.videoContainer} 
        activeOpacity={1}
        onPress={toggleControls}
      >
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: videoSource }}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isPlaying}
          onError={(error) => {
            console.error('Video playback error:', error);
            setError('Error playing video. Try a different quality.');
          }}
          onLoad={() => console.log('Video loaded successfully')}
        />

        {showControls && (
          <>
            <TouchableOpacity
              style={[styles.backButton, { top: insets.top + 10 }]}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.controlsOverlay}>
              <TouchableOpacity onPress={handlePlayPause} style={styles.playPauseButton}>
                <MaterialIcons 
                  name={isPlaying ? 'pause' : 'play-arrow'} 
                  size={60} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              <View style={styles.episodeInfo}>
                  <Text style={styles.episodeTitle}>{animeTitle || 'Unknown Anime'}</Text>
                  <Text style={styles.episodeNumber}>Episode {episodeNumber || episodeId}</Text>
                  <View style={styles.sourceInfo}>
                    <Text style={styles.qualityBadge}>{selectedQuality}</Text>
                    <Text style={styles.sourceBadge}>{detectedSource}</Text>
                  </View>
              </View>
              <View style={styles.controlButtons}>
                <TouchableOpacity style={styles.controlButton}>
                  <MaterialIcons name="skip-previous" size={32} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton}>
                  <MaterialIcons name="skip-next" size={32} color="#fff" />
                </TouchableOpacity>
                {availableSources.length > 1 && (
                  <TouchableOpacity 
                    style={styles.controlButton}
                    onPress={() => {
                      // Cycle through available qualities
                      const currentIndex = availableSources.findIndex(s => s.quality === selectedQuality);
                      const nextIndex = (currentIndex + 1) % availableSources.length;
                      changeQuality(availableSources[nextIndex]);
                    }}
                  >
                    <MaterialIcons name="hd" size={28} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: height,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    padding: 20,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  episodeInfo: {
    marginBottom: 16,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeNumber: {
    color: '#aaa',
    fontSize: 14,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
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
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sourceInfo: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  qualityBadge: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  sourceBadge: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 4,
    textTransform: 'uppercase',
  },
});

export default VideoPlayerScreen;

