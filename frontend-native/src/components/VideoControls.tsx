import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SubtitleTrack {
  url: string;
  lang: string;
  label?: string;
}

export interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isFullscreen: boolean;
  isLocked: boolean;
  subtitleTracks: SubtitleTrack[];
  currentSubtitle: string | null;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleFullscreen: () => void;
  onToggleLock: () => void;
  onSubtitleChange: (url: string | null) => void;
  onOrientationLock: (landscape: boolean) => void;
}

export function VideoControls({
  videoRef,
  isPlaying,
  currentTime,
  duration,
  buffered,
  volume,
  isFullscreen,
  isLocked,
  subtitleTracks,
  currentSubtitle,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleFullscreen,
  onToggleLock,
  onSubtitleChange,
  onOrientationLock,
}: VideoControlsProps) {
  const [showControls, setShowControls] = useState(true);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Auto-hide controls after 3 seconds
  const resetHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setShowControls(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (isPlaying && !isLocked) {
      hideTimeoutRef.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }, 3000);
    }
  }, [isPlaying, isLocked, fadeAnim]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isPlaying, resetHideTimer]);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: any) => {
    if (Platform.OS !== 'web') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  const handleVolumeClick = (e: any) => {
    if (Platform.OS !== 'web') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onVolumeChange(percentage);
  };

  // If locked, only show unlock button
  if (isLocked) {
    return (
      <View style={styles.lockedOverlay}>
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={onToggleLock}
        >
          <Ionicons name="lock-closed" size={24} color="#fff" />
          <Text style={styles.unlockText}>Tap to unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!showControls && isPlaying) {
    return (
      <TouchableOpacity
        style={styles.invisibleTouchArea}
        onPress={resetHideTimer}
        activeOpacity={1}
      />
    );
  }

  return (
    <Animated.View
      style={[styles.controlsOverlay, { opacity: fadeAnim }]}
      onTouchStart={resetHideTimer}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onToggleLock}
        >
          <Ionicons name="lock-open" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          {/* Subtitle button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowSubtitleMenu(!showSubtitleMenu)}
          >
            <Ionicons
              name="text"
              size={20}
              color={currentSubtitle ? '#e50914' : '#fff'}
            />
          </TouchableOpacity>

          {/* Orientation lock */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => onOrientationLock(true)}
          >
            <Ionicons name="phone-landscape" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subtitle menu dropdown */}
      {showSubtitleMenu && (
        <View style={styles.subtitleMenu}>
          <TouchableOpacity
            style={[
              styles.subtitleOption,
              !currentSubtitle && styles.subtitleOptionActive,
            ]}
            onPress={() => {
              onSubtitleChange(null);
              setShowSubtitleMenu(false);
            }}
          >
            <Text style={styles.subtitleOptionText}>Off</Text>
          </TouchableOpacity>
          {subtitleTracks.map((track, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.subtitleOption,
                currentSubtitle === track.url && styles.subtitleOptionActive,
              ]}
              onPress={() => {
                onSubtitleChange(track.url);
                setShowSubtitleMenu(false);
              }}
            >
              <Text style={styles.subtitleOptionText}>
                {track.label || track.lang || `Track ${index + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Center play/pause */}
      <View style={styles.centerControls}>
        <TouchableOpacity
          style={styles.seekButton}
          onPress={() => onSeek(currentTime - 10)}
        >
          <Ionicons name="play-back" size={28} color="#fff" />
          <Text style={styles.seekText}>10</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playButton} onPress={onPlayPause}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={40}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.seekButton}
          onPress={() => onSeek(currentTime + 10)}
        >
          <Ionicons name="play-forward" size={28} color="#fff" />
          <Text style={styles.seekText}>10</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <TouchableOpacity
            style={styles.progressBar}
            onPress={handleProgressClick}
            activeOpacity={1}
          >
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressBuffered,
                  { width: `${(buffered / duration) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.progressFilled,
                  { width: `${(currentTime / duration) * 100}%` },
                ]}
              />
            </View>
            <View
              style={[
                styles.progressThumb,
                { left: `${(currentTime / duration) * 100}%` },
              ]}
            />
          </TouchableOpacity>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          {/* Volume */}
          <View style={styles.volumeContainer}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setShowVolumeSlider(!showVolumeSlider)}
            >
              <Ionicons
                name={volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
            {showVolumeSlider && (
              <TouchableOpacity
                style={styles.volumeSlider}
                onPress={handleVolumeClick}
                activeOpacity={1}
              >
                <View style={styles.volumeBackground}>
                  <View
                    style={[styles.volumeFilled, { width: `${volume * 100}%` }]}
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Fullscreen */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onToggleFullscreen}
          >
            <Ionicons
              name={isFullscreen ? 'contract' : 'expand'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
  },
  invisibleTouchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleMenu: {
    position: 'absolute',
    top: 60,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    padding: 8,
    minWidth: 120,
    zIndex: 10,
  },
  subtitleOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  subtitleOptionActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.3)',
  },
  subtitleOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(229, 9, 20, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekButton: {
    alignItems: 'center',
  },
  seekText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  bottomBar: {
    padding: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
  },
  progressBar: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBuffered: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  progressFilled: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#e50914',
  },
  progressThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e50914',
    marginLeft: -7,
    top: 3,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeSlider: {
    width: 80,
    height: 20,
    justifyContent: 'center',
  },
  volumeBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeFilled: {
    height: '100%',
    backgroundColor: '#fff',
  },
});
