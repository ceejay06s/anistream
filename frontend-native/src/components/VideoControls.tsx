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

const isWeb = Platform.OS === 'web';

export interface SubtitleTrack {
  url: string;
  lang: string;
  label?: string;
}

export interface SubtitleSettings {
  fontSize: 'small' | 'medium' | 'large';
  backgroundColor: 'transparent' | 'semi' | 'solid';
}

export interface PlayerSource {
  url: string;
  quality: string;
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
  // Title bar props
  title?: string;
  episodeInfo?: string;
  onBack?: () => void;
  // Episode navigation (for mobile)
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  // Audio & quality
  category?: 'sub' | 'dub';
  onCategoryChange?: (cat: 'sub' | 'dub') => void;
  sources?: PlayerSource[];
  selectedSourceUrl?: string;
  onQualityChange?: (source: PlayerSource) => void;
  // Skip intro/outro
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  onSkipIntro?: () => void;
  onSkipOutro?: () => void;
  autoSkip?: boolean;
  onAutoSkipChange?: (val: boolean) => void;
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
  title,
  episodeInfo,
  onBack,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  category,
  onCategoryChange,
  sources,
  selectedSourceUrl,
  onQualityChange,
  intro,
  outro,
  onSkipIntro,
  onSkipOutro,
  autoSkip,
  onAutoSkipChange,
}: VideoControlsProps) {
  const [showControls, setShowControls] = useState(true);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(isWeb); // Always show on web
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showPlayerSettings, setShowPlayerSettings] = useState(false); // mobile settings panel
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
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

  const handleProgressHover = (e: any) => {
    if (!isWeb) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    setHoverTime(percentage * duration);
    setHoverPosition(x);
  };

  // Keyboard shortcuts for web
  useEffect(() => {
    if (!isWeb) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onSeek(currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSeek(currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          onVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'f':
          e.preventDefault();
          onToggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          onVolumeChange(volume === 0 ? 1 : 0);
          break;
        case 'j':
          e.preventDefault();
          onSeek(currentTime - 10);
          break;
        case 'l':
          e.preventDefault();
          onSeek(currentTime + 10);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWeb, currentTime, volume, onPlayPause, onSeek, onVolumeChange, onToggleFullscreen]);

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

  // For mobile (non-web), early return when controls are hidden
  if (!isWeb && !showControls && isPlaying) {
    return (
      <TouchableOpacity
        style={styles.invisibleTouchArea}
        onPress={resetHideTimer}
        activeOpacity={1}
      />
    );
  }

  // YouTube-style layout for web/PC
  // Note: always render on web (don't early-return) so touch events still work when controls are hidden
  if (isWeb) {
    return (
      <Animated.View
        style={[styles.controlsOverlay, styles.youtubeOverlay, { opacity: fadeAnim }]}
        // @ts-ignore - web only events
        onMouseMove={resetHideTimer}
        onMouseEnter={() => setShowControls(true)}
        onTouchStart={resetHideTimer}
      >
        {/* Gradient overlay at bottom */}
        <div style={youtubeStyles.gradient} />

        {/* Click area: show controls if hidden, toggle play/pause if visible */}
        <TouchableOpacity
          style={styles.youtubeClickArea}
          onPress={() => {
            if (!showControls) {
              resetHideTimer();
            } else {
              onPlayPause();
            }
          }}
          // @ts-ignore - web only
          onTouchStart={resetHideTimer}
          activeOpacity={1}
        />

        {/* Center play button (shows briefly on play/pause) */}
        {!isPlaying && (
          <View style={styles.youtubeCenterPlay}>
            <TouchableOpacity style={styles.youtubeBigPlayButton} onPress={onPlayPause}>
              <Ionicons name="play" size={48} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Settings menu */}
        {showSettingsMenu && (
          <View style={styles.youtubeSettingsMenu}>
            <Text style={styles.youtubeMenuTitle}>Settings</Text>

            {/* Audio (Sub/Dub) */}
            {onCategoryChange && (
              <TouchableOpacity
                style={styles.youtubeMenuItem}
                onPress={() => { setShowSettingsMenu(false); setShowAudioMenu(true); }}
              >
                <Ionicons name="headset" size={18} color="#fff" />
                <Text style={styles.youtubeMenuItemText}>Audio</Text>
                <Text style={styles.youtubeMenuItemValue}>{category === 'dub' ? 'DUB' : 'SUB'}</Text>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </TouchableOpacity>
            )}

            {/* Quality */}
            {sources && sources.length > 1 && onQualityChange && (
              <TouchableOpacity
                style={styles.youtubeMenuItem}
                onPress={() => { setShowSettingsMenu(false); setShowQualityMenu(true); }}
              >
                <Ionicons name="film" size={18} color="#fff" />
                <Text style={styles.youtubeMenuItemText}>Quality</Text>
                <Text style={styles.youtubeMenuItemValue}>
                  {sources.find(s => s.url === selectedSourceUrl)?.quality || 'Auto'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </TouchableOpacity>
            )}

            {/* Subtitles */}
            <TouchableOpacity
              style={styles.youtubeMenuItem}
              onPress={() => { setShowSettingsMenu(false); setShowSubtitleMenu(true); }}
            >
              <Ionicons name="text" size={18} color="#fff" />
              <Text style={styles.youtubeMenuItemText}>Subtitles</Text>
              <Text style={styles.youtubeMenuItemValue}>
                {currentSubtitle ? subtitleTracks.find(t => t.url === currentSubtitle)?.lang || 'On' : 'Off'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#888" />
            </TouchableOpacity>

            {/* Auto-skip toggle */}
            {(intro || outro) && onAutoSkipChange && (
              <TouchableOpacity
                style={styles.youtubeMenuItem}
                onPress={() => onAutoSkipChange(!autoSkip)}
              >
                <Ionicons name="play-skip-forward" size={18} color="#fff" />
                <Text style={styles.youtubeMenuItemText}>Auto-skip</Text>
                <Ionicons
                  name={autoSkip ? 'toggle' : 'toggle-outline'}
                  size={26}
                  color={autoSkip ? '#e50914' : '#888'}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Audio menu */}
        {showAudioMenu && (
          <View style={styles.youtubeSettingsMenu}>
            <TouchableOpacity style={styles.youtubeMenuBack} onPress={() => { setShowAudioMenu(false); setShowSettingsMenu(true); }}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.youtubeMenuTitle}>Audio</Text>
            </TouchableOpacity>
            {(['sub', 'dub'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.youtubeSubtitleItem, category === cat && styles.youtubeSubtitleItemActive]}
                onPress={() => { onCategoryChange?.(cat); setShowAudioMenu(false); }}
              >
                {category === cat && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 8 }} />}
                <Text style={styles.youtubeSubtitleText}>{cat.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quality menu */}
        {showQualityMenu && sources && (
          <View style={styles.youtubeSettingsMenu}>
            <TouchableOpacity style={styles.youtubeMenuBack} onPress={() => { setShowQualityMenu(false); setShowSettingsMenu(true); }}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.youtubeMenuTitle}>Quality</Text>
            </TouchableOpacity>
            {sources.map((src, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.youtubeSubtitleItem, selectedSourceUrl === src.url && styles.youtubeSubtitleItemActive]}
                onPress={() => { onQualityChange?.(src); setShowQualityMenu(false); }}
              >
                {selectedSourceUrl === src.url && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 8 }} />}
                <Text style={styles.youtubeSubtitleText}>{src.quality}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Subtitle selection menu */}
        {showSubtitleMenu && (
          <View style={styles.youtubeSettingsMenu}>
            <TouchableOpacity
              style={styles.youtubeMenuBack}
              onPress={() => { setShowSubtitleMenu(false); setShowSettingsMenu(true); }}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.youtubeMenuTitle}>Subtitles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.youtubeSubtitleItem, !currentSubtitle && styles.youtubeSubtitleItemActive]}
              onPress={() => { onSubtitleChange(null); setShowSubtitleMenu(false); }}
            >
              {!currentSubtitle && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 8 }} />}
              <Text style={styles.youtubeSubtitleText}>Off</Text>
            </TouchableOpacity>

            {subtitleTracks.map((track, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.youtubeSubtitleItem,
                  currentSubtitle === track.url && styles.youtubeSubtitleItemActive,
                ]}
                onPress={() => { onSubtitleChange(track.url); setShowSubtitleMenu(false); }}
              >
                {currentSubtitle === track.url && (
                  <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.youtubeSubtitleText}>
                  {track.label || track.lang || `Track ${index + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Skip Intro button */}
        {intro && currentTime >= intro.start && currentTime < intro.end && (
          <TouchableOpacity style={styles.skipOverlayButton} onPress={onSkipIntro}>
            <Text style={styles.skipOverlayText}>Skip Intro</Text>
            <Ionicons name="play-skip-forward-outline" size={16} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Skip Outro button */}
        {outro && currentTime >= outro.start && currentTime < outro.end && (
          <TouchableOpacity style={styles.skipOverlayButton} onPress={onSkipOutro}>
            <Text style={styles.skipOverlayText}>Skip Outro</Text>
            <Ionicons name="play-skip-forward-outline" size={16} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Subtitle button — top-right overlay */}
        <TouchableOpacity
          style={[styles.youtubeTopRightButton, { right: 60 }, currentSubtitle && styles.youtubeTopRightButtonActive]}
          onPress={() => {
            setShowSubtitleMenu(!showSubtitleMenu);
            setShowSettingsMenu(false);
          }}
        >
          <Ionicons name="text" size={20} color={currentSubtitle ? '#fff' : '#ccc'} />
          {currentSubtitle && <View style={styles.youtubeSubtitleIndicator} />}
        </TouchableOpacity>

        {/* Settings button — top-right overlay */}
        <TouchableOpacity
          style={styles.youtubeTopRightButton}
          onPress={() => {
            setShowSettingsMenu(!showSettingsMenu);
            setShowSubtitleMenu(false);
          }}
        >
          <Ionicons name="settings-sharp" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Bottom controls container */}
        <View style={styles.youtubeBottomContainer}>
          {/* Progress bar - full width YouTube style */}
          <div
            style={{
              ...youtubeStyles.progressWrapper,
              height: isHoveringProgress ? 5 : 3,
            }}
            onMouseEnter={() => setIsHoveringProgress(true)}
            onMouseLeave={() => {
              setIsHoveringProgress(false);
              setHoverTime(null);
            }}
            onMouseMove={handleProgressHover}
            onClick={handleProgressClick}
          >
            {/* Hover time preview */}
            {hoverTime !== null && isHoveringProgress && (
              <div
                style={{
                  ...youtubeStyles.hoverPreview,
                  left: hoverPosition,
                }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Buffer bar */}
            <div
              style={{
                ...youtubeStyles.progressBar,
                ...youtubeStyles.progressBuffered,
                width: `${(buffered / duration) * 100}%`,
              }}
            />

            {/* Progress bar */}
            <div
              style={{
                ...youtubeStyles.progressBar,
                ...youtubeStyles.progressFilled,
                width: `${(currentTime / duration) * 100}%`,
              }}
            />

            {/* Scrubber */}
            {isHoveringProgress && (
              <div
                style={{
                  ...youtubeStyles.scrubber,
                  left: `${(currentTime / duration) * 100}%`,
                }}
              />
            )}
          </div>

          {/* Controls row */}
          <View style={styles.youtubeControlsRow}>
            {/* Left controls */}
            <View style={styles.youtubeLeftControls}>
              {/* Play/Pause */}
              <TouchableOpacity style={styles.youtubeButton} onPress={onPlayPause}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
              </TouchableOpacity>

              {/* Next button */}
              {hasNext && (
                <TouchableOpacity style={styles.youtubeButton} onPress={onNext}>
                  <Ionicons name="play-skip-forward" size={20} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Volume */}
              <View style={styles.youtubeVolumeContainer}>
                <TouchableOpacity
                  style={styles.youtubeButton}
                  onPress={() => onVolumeChange(volume === 0 ? 1 : 0)}
                >
                  <Ionicons
                    name={volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'}
                    size={22}
                    color="#fff"
                  />
                </TouchableOpacity>
                <div
                  style={youtubeStyles.volumeSlider}
                  onClick={handleVolumeClick}
                >
                  <div style={youtubeStyles.volumeTrack}>
                    <div
                      style={{
                        ...youtubeStyles.volumeFilled,
                        width: `${volume * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </View>

              {/* Time */}
              <Text style={styles.youtubeTime}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
            </View>

            {/* Right controls */}
            <View style={styles.youtubeRightControls}>
              {/* Fullscreen */}
              <TouchableOpacity style={styles.youtubeButton} onPress={onToggleFullscreen}>
                <Ionicons name={isFullscreen ? 'contract' : 'expand'} size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Mobile layout (original)
  return (
    <Animated.View
      style={[styles.controlsOverlay, { opacity: fadeAnim }]}
      onTouchStart={resetHideTimer}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {(title || episodeInfo) && (
            <View style={styles.titleContainer}>
              {title && (
                <Text style={styles.videoTitle} numberOfLines={1}>{title}</Text>
              )}
              {episodeInfo && (
                <Text style={styles.episodeInfo} numberOfLines={1}>{episodeInfo}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onToggleLock}
          >
            <Ionicons name="lock-open" size={20} color="#fff" />
          </TouchableOpacity>
          {/* Subtitle button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.ccButton]}
            onPress={() => { setShowSubtitleMenu(!showSubtitleMenu); setShowPlayerSettings(false); }}
          >
            <Text style={[styles.ccText, currentSubtitle && styles.ccTextActive]}>CC</Text>
          </TouchableOpacity>

          {/* Settings button (audio + quality) */}
          {(onCategoryChange || (sources && sources.length > 1)) && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => { setShowPlayerSettings(!showPlayerSettings); setShowSubtitleMenu(false); }}
            >
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}

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

      {/* Player settings panel (audio + quality) */}
      {showPlayerSettings && (
        <View style={styles.subtitleMenu}>
          <Text style={styles.subtitleMenuTitle}>Settings</Text>

          {/* Audio */}
          {onCategoryChange && (
            <>
              <Text style={styles.settingsLabel}>Audio</Text>
              <View style={styles.settingsRow}>
                {(['sub', 'dub'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.settingsButton, category === cat && styles.settingsButtonActive]}
                    onPress={() => { onCategoryChange(cat); setShowPlayerSettings(false); }}
                  >
                    <Text style={[styles.settingsButtonText, category === cat && styles.settingsButtonTextActive]}>
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
              <Text style={styles.settingsLabel}>Quality</Text>
              <View style={styles.settingsRow}>
                {sources.map((src, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.settingsButton, selectedSourceUrl === src.url && styles.settingsButtonActive]}
                    onPress={() => { onQualityChange(src); setShowPlayerSettings(false); }}
                  >
                    <Text style={[styles.settingsButtonText, selectedSourceUrl === src.url && styles.settingsButtonTextActive]}>
                      {src.quality}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Auto-skip */}
          {(intro || outro) && onAutoSkipChange && (
            <>
              <Text style={styles.settingsLabel}>Skip</Text>
              <View style={styles.settingsRow}>
                <TouchableOpacity
                  style={[styles.settingsButton, autoSkip && styles.settingsButtonActive]}
                  onPress={() => { onAutoSkipChange(!autoSkip); }}
                >
                  <Text style={[styles.settingsButtonText, autoSkip && styles.settingsButtonTextActive]}>
                    Auto-skip {autoSkip ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Skip Intro / Outro buttons (mobile) */}
      {intro && currentTime >= intro.start && currentTime < intro.end && (
        <TouchableOpacity style={styles.skipOverlayButton} onPress={onSkipIntro}>
          <Text style={styles.skipOverlayText}>Skip Intro</Text>
          <Ionicons name="play-skip-forward-outline" size={16} color="#fff" />
        </TouchableOpacity>
      )}
      {outro && currentTime >= outro.start && currentTime < outro.end && (
        <TouchableOpacity style={styles.skipOverlayButton} onPress={onSkipOutro}>
          <Text style={styles.skipOverlayText}>Skip Outro</Text>
          <Ionicons name="play-skip-forward-outline" size={16} color="#fff" />
        </TouchableOpacity>
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
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  episodeInfo: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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

  skipOverlayButton: {
    position: 'absolute',
    bottom: 64,
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
    zIndex: 20,
  },
  skipOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // YouTube-style web controls
  youtubeOverlay: {
    backgroundColor: 'transparent',
  },
  youtubeClickArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 48,
  },
  youtubeCenterPlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeBigPlayButton: {
    width: 68,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  youtubeControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
  },
  youtubeLeftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  youtubeRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  youtubeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  youtubeButtonActive: {
    position: 'relative',
  },
  youtubeSubtitleIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 16,
    height: 3,
    backgroundColor: '#f00',
    borderRadius: 2,
  },
  youtubeVolumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  youtubeTime: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    fontVariant: ['tabular-nums'],
  },
  youtubeTopRightButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  youtubeTopRightButtonActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.5)',
  },
  youtubeSettingsMenu: {
    position: 'absolute',
    top: 56,
    right: 12,
    backgroundColor: 'rgba(28, 28, 28, 0.95)',
    borderRadius: 12,
    padding: 8,
    minWidth: 250,
    zIndex: 100,
  },
  youtubeMenuTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    padding: 8,
    paddingBottom: 4,
  },
  youtubeMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    gap: 12,
  },
  youtubeMenuItemText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  youtubeMenuItemValue: {
    color: '#aaa',
    fontSize: 13,
  },
  youtubeMenuBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 4,
  },
  youtubeSubtitleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingLeft: 32,
    borderRadius: 6,
  },
  youtubeSubtitleItemActive: {
    paddingLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  youtubeSubtitleText: {
    color: '#fff',
    fontSize: 14,
  },
});

// YouTube-style CSS for web
const youtubeStyles: Record<string, React.CSSProperties> = {
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
    pointerEvents: 'none',
  },
  progressWrapper: {
    position: 'relative',
    width: '100%',
    cursor: 'pointer',
    marginBottom: 8,
    transition: 'height 0.1s',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 2,
  },
  progressBuffered: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFilled: {
    backgroundColor: '#f00',
    zIndex: 1,
  },
  scrubber: {
    position: 'absolute',
    top: '50%',
    width: 13,
    height: 13,
    borderRadius: '50%',
    backgroundColor: '#f00',
    transform: 'translate(-50%, -50%)',
    zIndex: 2,
  },
  hoverPreview: {
    position: 'absolute',
    bottom: 16,
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
    pointerEvents: 'none',
    zIndex: 10,
  },
  volumeSlider: {
    width: 52,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    marginLeft: 4,
  },
  volumeTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  volumeFilled: {
    height: '100%',
    backgroundColor: '#fff',
  },
};
