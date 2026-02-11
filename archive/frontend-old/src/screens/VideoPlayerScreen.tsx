import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView, Modal, PanResponder, GestureResponderEvent } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { getStreamingSources, getRecommendedSource, StreamingSource, StreamingTrack } from '../services/streamingService';

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

  const [showControls, setShowControls] = useState(true);
  const [loadingSources, setLoadingSources] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [availableSources, setAvailableSources] = useState<StreamingSource[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [detectedSource, setDetectedSource] = useState<string>('HiAnime');

  // Subtitle state
  const [subtitleTracks, setSubtitleTracks] = useState<StreamingTrack[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<StreamingTrack | null>(null);
  const [showSubtitlePicker, setShowSubtitlePicker] = useState(false);

  // Progress bar state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const progressBarRef = useRef<View>(null);
  const progressBarWidth = useRef(0);

  // Create video player with the source
  const player = useVideoPlayer(videoSource, (player) => {
    if (videoSource) {
      console.log('🎬 Video player initialized with source');
      player.loop = false;
      player.play();
      setIsPlaying(true);
    }
  });

  // Listen to player status and playback changes
  useEffect(() => {
    if (!player) return;

    const statusSubscription = player.addListener('statusChange', (status) => {
      console.log('📺 Player status changed:', status);

      if (status === 'readyToPlay') {
        console.log('✅ Video ready to play');
        setIsBuffering(false);
      } else if (status === 'loading') {
        console.log('🔄 Video loading...');
        setIsBuffering(true);
      } else if (status === 'error') {
        console.error('❌ Video error');
        setError('Failed to play video. Try a different quality.');
        setIsBuffering(false);
      }
    });

    const playingSubscription = player.addListener('playingChange', (playing) => {
      console.log('▶️ Playing changed:', playing);
      setIsPlaying(playing);
      if (playing) {
        setIsBuffering(false);
      }
    });

    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
    };
  }, [player]);

  // Track playback time
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      if (!isSeeking && player.currentTime !== undefined) {
        setCurrentTime(player.currentTime);
      }
      if (player.duration && player.duration > 0) {
        setDuration(player.duration);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [player, isSeeking]);

  // Detect source from episode ID
  useEffect(() => {
    if (route.params.source) {
      setDetectedSource(route.params.source);
    } else {
      setDetectedSource('HiAnime');
    }
  }, [route.params.source]);

  useEffect(() => {
    loadStreamingSources();
  }, [episodeId, episodeUrl]);

  const loadStreamingSources = async () => {
    setLoadingSources(true);
    setError(null);

    try {
      console.log('=== Loading Streaming Sources (HiAnime) ===');
      console.log('Episode ID:', episodeId);
      console.log('Anime Title:', animeTitle);
      console.log('Episode Number:', episodeNumber);

      let sources: any[] = [];
      let streamingData: any = null;

      try {
        streamingData = await getStreamingSources(episodeId, 'HiAnime');

        if (streamingData && streamingData.sources) {
          console.log(`✅ Found ${streamingData.sources.length} sources`);
          sources = streamingData.sources;

          // Extract subtitle tracks
          if (streamingData.tracks && Array.isArray(streamingData.tracks)) {
            // Filter out thumbnail tracks and keep only subtitle tracks
            const subs = streamingData.tracks.filter((t: StreamingTrack) =>
              t.url && !t.url.includes('thumbnails') && t.url.includes('.vtt')
            );
            console.log(`📝 Found ${subs.length} subtitle tracks`);
            setSubtitleTracks(subs);

            // Auto-select English subtitle if available
            const englishSub = subs.find((t: StreamingTrack) =>
              t.lang.toLowerCase().includes('english') && !t.lang.includes('SDH')
            );
            if (englishSub) {
              console.log('📝 Auto-selected English subtitle');
              setSelectedSubtitle(englishSub);
            }
          }
        }
      } catch (err: any) {
        console.log('⚠️ Failed to load sources:', err.message);
      }

      if (sources.length === 0) {
        console.error('❌ No streaming sources returned');
        setError('No streaming sources available. Try a different episode.');
        setLoadingSources(false);
        return;
      }

      console.log(`✅ Total sources found: ${sources.length}`);
      sources.forEach((s, i) => {
        console.log(`Source ${i + 1}: ${s.quality} - ${s.url.substring(0, 50)}...`);
      });

      setAvailableSources(sources);

      const recommendedSource = getRecommendedSource(sources);

      if (recommendedSource) {
        console.log('✅ Selected source:', recommendedSource.quality);
        console.log('📺 Video URL:', recommendedSource.url);
        console.log('   Is proxied:', recommendedSource.url.includes('/proxy/m3u8'));
        setVideoSource(recommendedSource.url);
        setSelectedQuality(recommendedSource.quality);
        setLoadingSources(false);
      } else {
        console.error('❌ No suitable source found');
        setError('Could not find a suitable video source');
        setLoadingSources(false);
      }
    } catch (err) {
      console.error('❌ Error loading streaming sources:', err);
      setError(`Failed to load video: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoadingSources(false);
    }
  };

  const changeQuality = useCallback((source: StreamingSource) => {
    setVideoSource(source.url);
    setSelectedQuality(source.quality);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (player) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    }
  }, [player, isPlaying]);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  const selectSubtitle = useCallback((track: StreamingTrack | null) => {
    setSelectedSubtitle(track);
    setShowSubtitlePicker(false);
    console.log('📝 Selected subtitle:', track?.lang || 'Off');
  }, []);

  // Handle seek
  const handleSeek = useCallback((event: GestureResponderEvent, barWidth: number) => {
    if (!player || duration <= 0) return;

    const touchX = event.nativeEvent.locationX;
    const percentage = Math.max(0, Math.min(1, touchX / barWidth));
    const seekTime = percentage * duration;

    player.currentTime = seekTime;
    setCurrentTime(seekTime);
    console.log(`⏩ Seeking to ${formatTime(seekTime)}`);
  }, [player, duration]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (loadingSources) {
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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={toggleControls}
      >
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen
          allowsPictureInPicture
        />

        {isBuffering && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loadingText}>Buffering...</Text>
          </View>
        )}

        {/* Subtitle display */}
        {selectedSubtitle && (
          <SubtitleOverlay url={selectedSubtitle.url} player={player} />
        )}

        {showControls && (
          <>
            <TouchableOpacity
              style={[styles.backButton, { top: insets.top + 10 }]}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.bottomControls}>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle}>{animeTitle || 'Unknown Anime'}</Text>
                <Text style={styles.episodeNumber}>Episode {episodeNumber || episodeId}</Text>
                <View style={styles.sourceInfo}>
                  <Text style={styles.qualityBadge}>{selectedQuality}</Text>
                  <Text style={styles.sourceBadge}>{detectedSource}</Text>
                  {selectedSubtitle && (
                    <Text style={styles.subtitleBadge}>CC</Text>
                  )}
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <View
                  ref={progressBarRef}
                  style={styles.progressBar}
                  onLayout={(e) => {
                    progressBarWidth.current = e.nativeEvent.layout.width;
                  }}
                >
                  <TouchableOpacity
                    style={styles.progressTouchable}
                    activeOpacity={1}
                    onPress={(e) => handleSeek(e, progressBarWidth.current)}
                  >
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${progressPercentage}%` }
                        ]}
                      />
                      <View
                        style={[
                          styles.progressThumb,
                          { left: `${progressPercentage}%` }
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>

              <View style={styles.controlButtons}>
                <TouchableOpacity style={styles.controlButton}>
                  <MaterialIcons name="skip-previous" size={32} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={handlePlayPause}>
                  <MaterialIcons
                    name={isPlaying ? 'pause' : 'play-arrow'}
                    size={40}
                    color="#fff"
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton}>
                  <MaterialIcons name="skip-next" size={32} color="#fff" />
                </TouchableOpacity>
                {availableSources.length > 1 && (
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => {
                      const currentIndex = availableSources.findIndex(s => s.quality === selectedQuality);
                      const nextIndex = (currentIndex + 1) % availableSources.length;
                      changeQuality(availableSources[nextIndex]);
                    }}
                  >
                    <MaterialIcons name="hd" size={28} color="#fff" />
                  </TouchableOpacity>
                )}
                {subtitleTracks.length > 0 && (
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => setShowSubtitlePicker(true)}
                  >
                    <MaterialIcons
                      name="closed-caption"
                      size={28}
                      color={selectedSubtitle ? '#E50914' : '#fff'}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Subtitle Picker Modal */}
      <Modal
        visible={showSubtitlePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubtitlePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubtitlePicker(false)}
        >
          <View style={styles.subtitlePicker}>
            <Text style={styles.pickerTitle}>Subtitles</Text>
            <ScrollView style={styles.subtitleList}>
              <TouchableOpacity
                style={[
                  styles.subtitleOption,
                  !selectedSubtitle && styles.subtitleOptionSelected
                ]}
                onPress={() => selectSubtitle(null)}
              >
                <Text style={styles.subtitleOptionText}>Off</Text>
                {!selectedSubtitle && (
                  <MaterialIcons name="check" size={20} color="#E50914" />
                )}
              </TouchableOpacity>
              {subtitleTracks.map((track, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.subtitleOption,
                    selectedSubtitle?.url === track.url && styles.subtitleOptionSelected
                  ]}
                  onPress={() => selectSubtitle(track)}
                >
                  <Text style={styles.subtitleOptionText}>{track.lang}</Text>
                  {selectedSubtitle?.url === track.url && (
                    <MaterialIcons name="check" size={20} color="#E50914" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Simple subtitle overlay component
const SubtitleOverlay: React.FC<{ url: string; player: any }> = ({ url, player }) => {
  const [subtitles, setSubtitles] = useState<{ start: number; end: number; text: string }[]>([]);
  const [currentText, setCurrentText] = useState<string>('');

  // Parse VTT file
  useEffect(() => {
    const fetchSubtitles = async () => {
      try {
        const response = await fetch(url);
        const text = await response.text();
        const parsed = parseVTT(text);
        setSubtitles(parsed);
        console.log('📝 Loaded', parsed.length, 'subtitle cues');
      } catch (err) {
        console.error('Failed to load subtitles:', err);
      }
    };
    fetchSubtitles();
  }, [url]);

  // Update current subtitle based on playback position
  useEffect(() => {
    if (!player || subtitles.length === 0) return;

    const interval = setInterval(() => {
      const currentTime = player.currentTime || 0;
      const activeCue = subtitles.find(
        cue => currentTime >= cue.start && currentTime <= cue.end
      );
      setCurrentText(activeCue?.text || '');
    }, 100);

    return () => clearInterval(interval);
  }, [player, subtitles]);

  if (!currentText) return null;

  return (
    <View style={styles.subtitleContainer}>
      <Text style={styles.subtitleText}>{currentText}</Text>
    </View>
  );
};

// Parse WebVTT format
function parseVTT(vttContent: string): { start: number; end: number; text: string }[] {
  const cues: { start: number; end: number; text: string }[] = [];
  const lines = vttContent.split('\n');
  let i = 0;

  // Skip header
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim().split(' ')[0]);
      const start = parseTimestamp(startStr);
      const end = parseTimestamp(endStr);

      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
        // Remove VTT styling tags
        const cleanLine = lines[i].replace(/<[^>]+>/g, '').trim();
        if (cleanLine) textLines.push(cleanLine);
        i++;
      }

      if (textLines.length > 0) {
        cues.push({ start, end, text: textLines.join('\n') });
      }
    } else {
      i++;
    }
  }

  return cues;
}

function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  let seconds = 0;

  if (parts.length === 3) {
    // HH:MM:SS.mmm
    seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS.mmm
    seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }

  return seconds;
}

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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  subtitleBadge: {
    color: '#2196F3',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderRadius: 4,
  },
  // Progress bar styles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 45,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  progressTouchable: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    backgroundColor: '#E50914',
    borderRadius: 7,
    marginLeft: -7,
  },
  // Subtitle overlay styles
  subtitleContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  subtitleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Subtitle picker modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  subtitlePicker: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.5,
    paddingBottom: 40,
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  subtitleList: {
    maxHeight: height * 0.4,
  },
  subtitleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  subtitleOptionSelected: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  subtitleOptionText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default VideoPlayerScreen;
