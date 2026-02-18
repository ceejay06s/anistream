import { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { SubtitleRenderer } from './SubtitleRenderer';

export interface SubtitleTrack {
  url: string;
  lang: string;
  label?: string;
}

export interface VideoPlayerProps {
  source: string;
  autoPlay?: boolean;
  style?: any;
  onError?: (error: string) => void;
  onReady?: () => void;
  // For web iframe fallback (not used on native)
  animeId?: string;
  episodeNumber?: string;
  fullEpisodeId?: string;
  subtitleTracks?: SubtitleTrack[];
  // Callback to request new source when current one fails
  onRequestNewSource?: () => void;
  // Title bar props (web only, native has OS navigation)
  title?: string;
  onBack?: () => void;
  // Callback to get current time for clipping
  onCurrentTimeChange?: (time: number) => void;
  // Episode navigation
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  // Resume playback from timestamp
  initialTime?: number;
}

export function VideoPlayer({
  source,
  autoPlay = true,
  style,
  onError,
  onReady,
  subtitleTracks = [],
  onRequestNewSource,
  onCurrentTimeChange,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  initialTime,
}: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const hasSeekToInitial = useRef(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);

  const player = useVideoPlayer(source, (player) => {
    player.loop = false;
    if (autoPlay) {
      player.play();
    }
  });

  useEffect(() => {
    if (!player) return;

    const statusSubscription = player.addListener('statusChange', (status) => {
      console.log('Player status:', status);

      if (status.status === 'readyToPlay') {
        setIsLoading(false);
        setError(null);
        // Seek to initial time if provided (for resume functionality)
        if (initialTime && initialTime > 0 && !hasSeekToInitial.current) {
          hasSeekToInitial.current = true;
          player.seekBy(initialTime);
        }
        onReady?.();
      } else if (status.status === 'loading') {
        setIsLoading(true);
      } else if (status.status === 'error') {
        setIsLoading(false);
        const errorMessage = status.error?.message || 'Video playback failed';
        // If we have a callback for new source, use it instead of showing error
        if (onRequestNewSource) {
          console.log('Playback error, requesting new source...');
          onRequestNewSource();
        } else {
          setError(errorMessage);
          onError?.(errorMessage);
        }
      }
    });

    return () => {
      statusSubscription.remove();
    };
  }, [player, onError, onReady]);

  // Track current time for subtitle sync
  useEffect(() => {
    if (!player || !currentSubtitle) {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
        timeUpdateRef.current = null;
      }
      return;
    }

    // Update time every 100ms for smooth subtitle sync
    timeUpdateRef.current = setInterval(() => {
      if (player.currentTime !== undefined) {
        const newTime = player.currentTime;
        setCurrentTime(newTime);
        // Notify parent of time change for clipping
        if (onCurrentTimeChange) {
          onCurrentTimeChange(newTime);
        }
      }
    }, 100);

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
        timeUpdateRef.current = null;
      }
    };
  }, [player, currentSubtitle, onCurrentTimeChange]);

  // Auto-select first subtitle if available
  useEffect(() => {
    if (subtitleTracks.length > 0 && !currentSubtitle) {
      // Find English subtitle or use first one
      const englishTrack = subtitleTracks.find(
        t => t.lang?.toLowerCase().includes('english') || t.lang?.toLowerCase() === 'en'
      );
      setCurrentSubtitle(englishTrack?.url || subtitleTracks[0].url);
    }
  }, [subtitleTracks]);

  // Handle fullscreen orientation lock
  const handleFullscreenEnter = useCallback(async () => {
    setIsFullscreen(true);
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch (e) {
      console.log('Orientation lock not supported');
    }
  }, []);

  const handleFullscreenExit = useCallback(async () => {
    setIsFullscreen(false);
    try {
      await ScreenOrientation.unlockAsync();
    } catch (e) {
      console.log('Orientation unlock not supported');
    }
  }, []);

  const toggleLock = useCallback(() => {
    setIsLocked(!isLocked);
  }, [isLocked]);

  if (error) {
    return (
      <View style={[styles.container, style, styles.errorContainer]}>
        <Text style={styles.errorText}>Failed to load video</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setIsLoading(true);
            player.replace(source);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={!isLocked}
        allowsFullscreen
        allowsPictureInPicture
        onFullscreenEnter={handleFullscreenEnter}
        onFullscreenExit={handleFullscreenExit}
      />

      {/* Lock overlay */}
      {isLocked && (
        <TouchableOpacity
          style={styles.lockOverlay}
          onPress={toggleLock}
          activeOpacity={1}
        >
          <View style={styles.unlockButton}>
            <Ionicons name="lock-closed" size={24} color="#fff" />
            <Text style={styles.unlockText}>Tap to unlock</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Lock button (visible when not locked) */}
      {!isLocked && showControls && (
        <TouchableOpacity
          style={styles.lockButton}
          onPress={toggleLock}
        >
          <Ionicons name="lock-open" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Subtitle renderer overlay */}
      <SubtitleRenderer
        currentTime={currentTime}
        subtitleUrl={currentSubtitle}
      />

      {/* Subtitle selector button */}
      {subtitleTracks.length > 0 && (
        <TouchableOpacity
          style={styles.subtitleButton}
          onPress={() => setShowSubtitleMenu(true)}
        >
          <Ionicons
            name="text"
            size={20}
            color={currentSubtitle ? '#e50914' : '#fff'}
          />
        </TouchableOpacity>
      )}

      {/* Subtitle selection modal */}
      <Modal
        visible={showSubtitleMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubtitleMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubtitleMenu(false)}
        >
          <View style={styles.subtitleMenuContainer}>
            <Text style={styles.subtitleMenuTitle}>Subtitles</Text>
            <ScrollView style={styles.subtitleList}>
              {/* Always show "Off" option first */}
              <TouchableOpacity
                style={[
                  styles.subtitleOption,
                  !currentSubtitle && styles.subtitleOptionActive,
                ]}
                onPress={() => {
                  setCurrentSubtitle(null);
                  setShowSubtitleMenu(false);
                }}
              >
                <Text style={styles.subtitleOptionText}>Off</Text>
                {!currentSubtitle && (
                  <Ionicons name="checkmark" size={18} color="#e50914" />
                )}
              </TouchableOpacity>
              {/* Show subtitle tracks if available */}
              {subtitleTracks.length > 0 ? (
                subtitleTracks.map((track, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.subtitleOption,
                      currentSubtitle === track.url && styles.subtitleOptionActive,
                    ]}
                    onPress={() => {
                      setCurrentSubtitle(track.url);
                      setShowSubtitleMenu(false);
                    }}
                  >
                    <Text style={styles.subtitleOptionText}>
                      {track.label || track.lang || `Track ${index + 1}`}
                    </Text>
                    {currentSubtitle === track.url && (
                      <Ionicons name="checkmark" size={18} color="#e50914" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.subtitleOption}>
                  <Text style={styles.noSubtitlesText}>No subtitles available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Episode navigation buttons */}
      {(hasPrevious || hasNext) && !isLocked && (
        <View style={styles.episodeNavContainer}>
          <TouchableOpacity
            style={[styles.episodeNavButton, !hasPrevious && styles.episodeNavButtonDisabled]}
            onPress={hasPrevious ? onPrevious : undefined}
            disabled={!hasPrevious}
          >
            <Ionicons name="play-skip-back" size={20} color={hasPrevious ? '#fff' : '#666'} />
            <Text style={[styles.episodeNavText, !hasPrevious && styles.episodeNavTextDisabled]}>Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.episodeNavButton, !hasNext && styles.episodeNavButtonDisabled]}
            onPress={hasNext ? onNext : undefined}
            disabled={!hasNext}
          >
            <Text style={[styles.episodeNavText, !hasNext && styles.episodeNavTextDisabled]}>Next</Text>
            <Ionicons name="play-skip-forward" size={20} color={hasNext ? '#fff' : '#666'} />
          </TouchableOpacity>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#e50914',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorDetail: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  unlockText: {
    color: '#fff',
    fontSize: 14,
  },
  lockButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleMenuContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 300,
    maxHeight: '60%',
  },
  subtitleMenuTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitleList: {
    maxHeight: 300,
  },
  subtitleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  subtitleOptionActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
  },
  subtitleOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  noSubtitlesText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  episodeNavContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  episodeNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  episodeNavButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  episodeNavText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  episodeNavTextDisabled: {
    color: '#666',
  },
});
