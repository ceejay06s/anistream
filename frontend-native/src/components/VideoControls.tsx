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

export interface SubtitleSettings {
  fontSize: 'small' | 'medium' | 'large';
  backgroundColor: 'transparent' | 'semi' | 'solid';
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
  subtitleSettings: SubtitleSettings;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleFullscreen: () => void;
  onToggleLock: () => void;
  onSubtitleChange: (url: string | null) => void;
  onSubtitleSettingsChange: (settings: SubtitleSettings) => void;
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
  subtitleSettings,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleFullscreen,
  onToggleLock,
  onSubtitleChange,
  onSubtitleSettingsChange,
  onOrientationLock,
}: VideoControlsProps) {
  const [showControls, setShowControls] = useState(true);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
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
            style={[styles.controlButton, styles.ccButton]}
            onPress={() => setShowSubtitleMenu(!showSubtitleMenu)}
          >
            <Text style={[styles.ccText, currentSubtitle && styles.ccTextActive]}>CC</Text>
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
      {showSubtitleMenu && !showSubtitleSettings && (
        <View style={styles.subtitleMenu}>
          <Text style={styles.subtitleMenuTitle}>Subtitles</Text>
          {/* Always show "Off" option first */}
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
            {!currentSubtitle && (
              <Ionicons name="checkmark" size={16} color="#e50914" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
          {/* Show subtitle tracks if available */}
          {subtitleTracks.length > 0 ? (
            <>
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
                  {currentSubtitle === track.url && (
                    <Ionicons name="checkmark" size={16} color="#e50914" style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              ))}
              <View style={styles.subtitleDivider} />
              <TouchableOpacity
                style={styles.subtitleOption}
                onPress={() => setShowSubtitleSettings(true)}
              >
                <Ionicons name="settings-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.subtitleOptionText}>CC Settings</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noSubtitlesText}>No subtitles available</Text>
          )}
        </View>
      )}

      {/* Subtitle settings submenu */}
      {showSubtitleSettings && (
        <View style={styles.subtitleMenu}>
          <TouchableOpacity
            style={styles.settingsBackButton}
            onPress={() => setShowSubtitleSettings(false)}
          >
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={styles.subtitleMenuTitle}>CC Settings</Text>
          </TouchableOpacity>

          <Text style={styles.settingsLabel}>Font Size</Text>
          <View style={styles.settingsRow}>
            {(['small', 'medium', 'large'] as const).map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.settingsButton,
                  subtitleSettings.fontSize === size && styles.settingsButtonActive,
                ]}
                onPress={() => onSubtitleSettingsChange({ ...subtitleSettings, fontSize: size })}
              >
                <Text style={[
                  styles.settingsButtonText,
                  subtitleSettings.fontSize === size && styles.settingsButtonTextActive,
                ]}>
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.settingsLabel}>Background</Text>
          <View style={styles.settingsRow}>
            {([
              { value: 'transparent', label: 'None' },
              { value: 'semi', label: 'Semi' },
              { value: 'solid', label: 'Solid' },
            ] as const).map((bg) => (
              <TouchableOpacity
                key={bg.value}
                style={[
                  styles.settingsButton,
                  subtitleSettings.backgroundColor === bg.value && styles.settingsButtonActive,
                ]}
                onPress={() => onSubtitleSettingsChange({ ...subtitleSettings, backgroundColor: bg.value })}
              >
                <Text style={[
                  styles.settingsButtonText,
                  subtitleSettings.backgroundColor === bg.value && styles.settingsButtonTextActive,
                ]}>
                  {bg.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  ccButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ccText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ccTextActive: {
    color: '#e50914',
  },
  subtitleMenu: {
    position: 'absolute',
    top: 60,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 8,
    padding: 12,
    minWidth: 160,
    zIndex: 10,
  },
  subtitleMenuTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subtitleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  subtitleOptionActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.3)',
  },
  subtitleOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  noSubtitlesText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  subtitleDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
  },
  settingsBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  settingsLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  settingsButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  settingsButtonActive: {
    backgroundColor: '#e50914',
  },
  settingsButtonText: {
    color: '#aaa',
    fontSize: 12,
  },
  settingsButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
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
