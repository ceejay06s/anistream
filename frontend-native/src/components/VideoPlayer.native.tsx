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

export interface PlayerSource {
  url: string;
  quality: string;
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
  // Audio & quality
  category?: 'sub' | 'dub';
  onCategoryChange?: (cat: 'sub' | 'dub') => void;
  sources?: PlayerSource[];
  selectedSourceUrl?: string;
  onQualityChange?: (source: PlayerSource) => void;
  // Skip intro/outro
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
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
  category,
  onCategoryChange,
  sources,
  selectedSourceUrl,
  onQualityChange,
  intro,
  outro,
}: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const hasSeekToInitial = useRef(false);
  const videoViewRef = useRef<any>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [autoSkip, setAutoSkip] = useState(false);
  const timeUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSkippedIntroRef = useRef(false);
  const autoSkippedOutroRef = useRef(false);

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
        setIsPlayerReady(true);
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

  // Track current time for subtitle sync, auto-skip, and time reporting
  useEffect(() => {
    const needsTimeTracking = currentSubtitle || intro || outro || onCurrentTimeChange;
    if (!player || !needsTimeTracking) {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
        timeUpdateRef.current = null;
      }
      return;
    }

    // Update time every 250ms (subtitle sync uses 100ms, but for skip 250ms is sufficient)
    timeUpdateRef.current = setInterval(() => {
      if (player.currentTime !== undefined) {
        const newTime = player.currentTime;
        setCurrentTime(newTime);
        if (onCurrentTimeChange) {
          onCurrentTimeChange(newTime);
        }
        // Auto-skip logic
        if (autoSkip) {
          if (intro && newTime >= intro.start && newTime < intro.end && !autoSkippedIntroRef.current) {
            autoSkippedIntroRef.current = true;
            player.currentTime = intro.end;
          }
          if (outro && newTime >= outro.start && newTime < outro.end && !autoSkippedOutroRef.current) {
            autoSkippedOutroRef.current = true;
            player.currentTime = outro.end;
          }
        }
      }
    }, 250);

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
        timeUpdateRef.current = null;
      }
    };
  }, [player, currentSubtitle, intro, outro, onCurrentTimeChange, autoSkip]);

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

  // Reset seek/skip flags when source changes
  useEffect(() => {
    hasSeekToInitial.current = false;
    setIsPlayerReady(false);
    autoSkippedIntroRef.current = false;
    autoSkippedOutroRef.current = false;
  }, [source]);

  // Handle initial seek — fires when initialTime is set OR when player becomes ready
  useEffect(() => {
    if (isPlayerReady && initialTime && initialTime > 0 && !hasSeekToInitial.current) {
      hasSeekToInitial.current = true;
      player.currentTime = initialTime;
    }
  }, [initialTime, isPlayerReady, player]);

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
        ref={videoViewRef}
        player={player}
        style={styles.video}
        contentFit="fill"
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

      {/* Fullscreen button */}
      {!isLocked && (
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={() => {
            if (isFullscreen) {
              videoViewRef.current?.exitFullscreen();
            } else {
              videoViewRef.current?.enterFullscreen();
            }
          }}
        >
          <Ionicons name={isFullscreen ? 'contract' : 'expand'} size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Skip Intro button */}
      {intro && currentTime >= intro.start && currentTime < intro.end && !isLocked && (
        <TouchableOpacity
          style={styles.skipOverlayButton}
          onPress={() => { player.currentTime = intro.end; }}
        >
          <Text style={styles.skipOverlayText}>Skip Intro</Text>
          <Ionicons name="play-skip-forward-outline" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Skip Outro button */}
      {outro && currentTime >= outro.start && currentTime < outro.end && !isLocked && (
        <TouchableOpacity
          style={styles.skipOverlayButton}
          onPress={() => { player.currentTime = outro.end; }}
        >
          <Text style={styles.skipOverlayText}>Skip Outro</Text>
          <Ionicons name="play-skip-forward-outline" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Subtitle renderer overlay */}
      <SubtitleRenderer
        currentTime={currentTime}
        subtitleUrl={currentSubtitle}
      />

      {/* Settings button (audio + quality) */}
      {(onCategoryChange || (sources && sources.length > 1)) && (
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettingsMenu(true)}
        >
          <Ionicons name="settings-outline" size={20} color="#fff" />
        </TouchableOpacity>
      )}

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

      {/* Settings modal (audio + quality) */}
      <Modal
        visible={showSettingsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsMenu(false)}
        >
          <View style={styles.subtitleMenuContainer}>
            <Text style={styles.subtitleMenuTitle}>Settings</Text>
            <ScrollView style={styles.subtitleList}>
              {/* Audio */}
              {onCategoryChange && (
                <>
                  <Text style={styles.settingsSectionLabel}>Audio</Text>
                  <View style={styles.settingsRow}>
                    {(['sub', 'dub'] as const).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.settingsOption, category === cat && styles.settingsOptionActive]}
                        onPress={() => { onCategoryChange(cat); setShowSettingsMenu(false); }}
                      >
                        <Text style={[styles.settingsOptionText, category === cat && styles.settingsOptionTextActive]}>
                          {cat.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              {/* Quality */}
              {sources && sources.length > 1 && onQualityChange && (
                <>
                  <Text style={styles.settingsSectionLabel}>Quality</Text>
                  <View style={styles.settingsRow}>
                    {sources.map((src, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.settingsOption, selectedSourceUrl === src.url && styles.settingsOptionActive]}
                        onPress={() => { onQualityChange(src); setShowSettingsMenu(false); }}
                      >
                        <Text style={[styles.settingsOptionText, selectedSourceUrl === src.url && styles.settingsOptionTextActive]}>
                          {src.quality}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Auto-skip toggle */}
              {(intro || outro) && (
                <>
                  <Text style={styles.settingsSectionLabel}>Skip</Text>
                  <View style={styles.settingsRow}>
                    <TouchableOpacity
                      style={[styles.settingsOption, autoSkip && styles.settingsOptionActive]}
                      onPress={() => setAutoSkip(v => !v)}
                    >
                      <Text style={[styles.settingsOptionText, autoSkip && styles.settingsOptionTextActive]}>
                        Auto-skip {autoSkip ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
  settingsButton: {
    position: 'absolute',
    top: 12,
    right: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenButton: {
    position: 'absolute',
    top: 12,
    right: 108,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipOverlayButton: {
    position: 'absolute',
    bottom: 60,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  skipOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsSectionLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  settingsOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  settingsOptionActive: {
    backgroundColor: '#e50914',
  },
  settingsOptionText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsOptionTextActive: {
    color: '#fff',
    fontWeight: '700',
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
