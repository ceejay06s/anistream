import { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import Hls from 'hls.js';
import { VideoControls, SubtitleTrack, SubtitleSettings, PlayerSource } from './VideoControls';
import { SubtitleRenderer } from './SubtitleRenderer';
import { buildIframeSource } from './playerFallback';

export interface VideoPlayerProps {
  source: string;
  autoPlay?: boolean;
  style?: any;
  onError?: (error: string) => void;
  onReady?: () => void;
  // For iframe fallback
  animeId?: string;
  episodeNumber?: string;
  fullEpisodeId?: string;
  iframeEmbedUrl?: string | null;
  // Subtitle tracks from streaming data
  subtitleTracks?: SubtitleTrack[];
  // Callback to request new source when current one fails
  onRequestNewSource?: () => void;
  // Title bar props
  title?: string;
  onBack?: () => void;
  // Callback to get current time for clipping
  onCurrentTimeChange?: (time: number) => void;
  // Episode navigation
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  // Resume playback
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
  animeId,
  episodeNumber,
  fullEpisodeId,
  iframeEmbedUrl,
  subtitleTracks = [],
  onRequestNewSource,
  title,
  onBack,
  onCurrentTimeChange,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  initialTime,
  category,
  onCategoryChange,
  sources,
  selectedSourceUrl,
  onQualityChange,
  intro,
  outro,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasSeekToInitial = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useIframe, setUseIframe] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showIframeOption, setShowIframeOption] = useState(false);
  const canUseIframeFallback = Boolean(iframeEmbedUrl || animeId);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    fontSize: 'medium',
    backgroundColor: 'semi',
  });
  const [useCustomControls, setUseCustomControls] = useState(true);
  const [autoSkip, setAutoSkip] = useState(false);
  const autoSkippedIntroRef = useRef(false);
  const autoSkippedOutroRef = useRef(false);

  const showStreamError = (message: string) => {
    console.log('Stream error:', message);
    setError(message);
    setIsLoading(false);
    setShowIframeOption(true);
  };

  const switchToIframe = () => {
    console.log('Switching to iframe fallback...');
    setUseIframe(true);
    setError(null);
    setIsLoading(false);
  };

  const retryStream = () => {
    setError(null);
    setRetryCount(0);
    setShowIframeOption(false);
    setIsLoading(true);
    // Force re-mount by changing source key
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video && source) {
      // Re-trigger the effect
      video.src = '';
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 100);
    }
  };

  useEffect(() => {
    if (!source && iframeEmbedUrl) {
      setUseIframe(true);
      setError(null);
      setIsLoading(false);
    }
  }, [source, iframeEmbedUrl]);

  // Exit iframe mode if a direct stream source becomes available again.
  useEffect(() => {
    if (useIframe && source) {
      setUseIframe(false);
      setError(null);
      setIsLoading(true);
    }
  }, [useIframe, source]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = video.currentTime;
    setCurrentTime(newTime);
    
    // Notify parent of time change for clipping
    if (onCurrentTimeChange) {
      onCurrentTimeChange(newTime);
    }

    // Update buffered
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  }, [onCurrentTimeChange]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVolume;
    setVolume(newVolume);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(console.error);
      } else if ((video as any)?.webkitEnterFullscreen) {
        // iOS Safari fallback — only supports fullscreen on <video> directly
        (video as any).webkitEnterFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(console.error);
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  const handleToggleLock = useCallback(() => {
    setIsLocked(!isLocked);
  }, [isLocked]);

  const handleSubtitleChange = useCallback((url: string | null) => {
    // Use our custom SubtitleRenderer instead of native <track> elements
    // This supports both VTT and ASS subtitle formats
    setCurrentSubtitle(url);
  }, []);

  const handleSubtitleSettingsChange = useCallback((newSettings: SubtitleSettings) => {
    setSubtitleSettings(newSettings);
  }, []);

  const handleOrientationLock = useCallback((landscape: boolean) => {
    if ('screen' in window && 'orientation' in window.screen) {
      const screenOrientation = (window.screen as any).orientation;
      if (screenOrientation && screenOrientation.lock) {
        screenOrientation.lock(landscape ? 'landscape' : 'portrait')
          .catch((err: Error) => console.log('Orientation lock not supported:', err.message));
      }
    }
  }, []);

  // Fullscreen change listener (standard + webkit for iOS Safari)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-select first subtitle if available
  useEffect(() => {
    if (subtitleTracks.length > 0 && !currentSubtitle) {
      // Find English subtitle or use first one
      const englishTrack = subtitleTracks.find(
        t => t.lang?.toLowerCase().includes('english') || t.lang?.toLowerCase() === 'en'
      );
      const selectedTrack = englishTrack || subtitleTracks[0];
      console.log('Auto-selecting subtitle:', selectedTrack?.lang, selectedTrack?.url);
      setCurrentSubtitle(selectedTrack?.url || null);
    }
  }, [subtitleTracks]);

  useEffect(() => {
    if (useIframe) return;

    const video = videoRef.current;
    if (!video || !source) {
      if (!source && canUseIframeFallback) {
        setShowIframeOption(true);
        setIsLoading(false);
      }
      return;
    }

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsLoading(true);
    setError(null);

    // Video event listeners
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleDurationChange = () => setDuration(video.duration);
    const handleVolumeUpdate = () => setVolume(video.volume);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeUpdate);

    const isHLS = source.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });

      hlsRef.current = hls;

      hls.loadSource(source);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed');
        setIsLoading(false);
        onReady?.();

        if (autoPlay) {
          video.play().catch((e) => {
            console.log('Autoplay prevented:', e);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', event, data);
        if (data.fatal) {
          const responseCode = data.response?.code;
          const is403 = responseCode === 403 ||
                        data.details?.includes('403') ||
                        (data.type === Hls.ErrorTypes.NETWORK_ERROR && typeof responseCode === 'number' && responseCode >= 400);

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (onRequestNewSource) {
                // Network error (including 403), request new source
                console.log(`Network error (${is403 ? '403' : 'other'}), requesting new source...`);
                hls.destroy();
                setIsLoading(true);
                // Small delay before requesting new source to avoid hammering servers
                setTimeout(() => {
                  onRequestNewSource();
                }, 500);
              } else if (retryCount < 3) {
                setRetryCount(r => r + 1);
                console.log(`Network error, attempting recovery (${retryCount + 1}/3)...`);
                hls.startLoad();
              } else {
                hls.destroy();
                showStreamError('Network error loading video stream.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              if (onRequestNewSource) {
                console.log('Fatal error, requesting new source...');
                hls.destroy();
                setIsLoading(true);
                setTimeout(() => {
                  onRequestNewSource();
                }, 500);
              } else {
                hls.destroy();
                showStreamError('Failed to load video stream.');
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        onReady?.();
        if (autoPlay) {
          video.play().catch((e) => console.log('Autoplay prevented:', e));
        }
      });
    } else {
      video.src = source;
      video.addEventListener('loadeddata', () => {
        setIsLoading(false);
        onReady?.();
        if (autoPlay) {
          video.play().catch((e) => console.log('Autoplay prevented:', e));
        }
      });
    }

    video.addEventListener('error', () => {
      const videoError = video.error;
      console.error('Video error:', videoError);
      showStreamError(videoError?.message || 'Video playback error');
    });

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeUpdate);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, autoPlay, useIframe, retryCount]);

  // Reset seek state and auto-skip flags when source changes
  useEffect(() => {
    hasSeekToInitial.current = false;
    autoSkippedIntroRef.current = false;
    autoSkippedOutroRef.current = false;
  }, [source]);

  // Auto-skip intro/outro when enabled
  useEffect(() => {
    if (!autoSkip) return;
    if (intro && currentTime >= intro.start && currentTime < intro.end && !autoSkippedIntroRef.current) {
      autoSkippedIntroRef.current = true;
      handleSeek(intro.end);
    }
    if (outro && currentTime >= outro.start && currentTime < outro.end && !autoSkippedOutroRef.current) {
      autoSkippedOutroRef.current = true;
      handleSeek(outro.end);
    }
  }, [currentTime, autoSkip, intro, outro, handleSeek]);

  // Handle initial seek — fires when initialTime is set OR when loading finishes
  useEffect(() => {
    const video = videoRef.current;
    if (!isLoading && video && initialTime && initialTime > 0 && !hasSeekToInitial.current) {
      hasSeekToInitial.current = true;
      video.currentTime = initialTime;
    }
  }, [initialTime, isLoading]);

  // Iframe fallback: backend embed URL first, direct hianime URL as last fallback
  if (useIframe && canUseIframeFallback) {
    const iframeSrc = buildIframeSource({
      iframeEmbedUrl,
      animeId,
      episodeNumber,
      fullEpisodeId,
    });
    if (!iframeSrc) {
      return null;
    }
    const noticeText = iframeEmbedUrl ? 'Playing via backend embed fallback' : 'Playing via hianime.to';

    return (
      <View style={[styles.container, style]}>
        <iframe
          src={iframeSrc}
          style={iframeStyles}
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          referrerPolicy="origin"
          title={`Episode ${episodeNumber || '1'}`}
        />
        <View style={styles.iframeNotice}>
          <Text style={styles.iframeNoticeText}>{noticeText}</Text>
        </View>
      </View>
    );
  }

  // Show error with retry and iframe options
  if (error && !useIframe) {
    return (
      <View style={[styles.container, style, styles.errorContainer]}>
        <Text style={styles.errorText}>Failed to load video</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={retryStream}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          {showIframeOption && canUseIframeFallback && (
            <TouchableOpacity style={styles.iframeButton} onPress={switchToIframe}>
              <Text style={styles.iframeButtonText}>Use Iframe Player</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <div ref={containerRef} style={containerStyles}>
        <video
          ref={videoRef}
          style={videoStyles}
          controls={!useCustomControls}
          playsInline
          crossOrigin="anonymous"
        />
        {/* Subtitle overlay */}
        <SubtitleRenderer
          currentTime={currentTime}
          subtitleUrl={currentSubtitle}
          settings={subtitleSettings}
        />
        {useCustomControls && !isLoading && (
          <VideoControls
            videoRef={videoRef}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            volume={volume}
            isFullscreen={isFullscreen}
            isLocked={isLocked}
            subtitleTracks={subtitleTracks}
            currentSubtitle={currentSubtitle}
            subtitleSettings={subtitleSettings}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onToggleFullscreen={handleToggleFullscreen}
            onToggleLock={handleToggleLock}
            onSubtitleChange={handleSubtitleChange}
            onSubtitleSettingsChange={handleSubtitleSettingsChange}
            onOrientationLock={handleOrientationLock}
            title={title}
            episodeInfo={episodeNumber ? `Episode ${episodeNumber}` : undefined}
            onBack={onBack}
            onPrevious={onPrevious}
            onNext={onNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            category={category}
            onCategoryChange={onCategoryChange}
            sources={sources}
            selectedSourceUrl={selectedSourceUrl}
            onQualityChange={onQualityChange}
            intro={intro}
            outro={outro}
            onSkipIntro={() => intro && handleSeek(intro.end)}
            onSkipOutro={() => outro && handleSeek(outro.end)}
            autoSkip={autoSkip}
            onAutoSkipChange={setAutoSkip}
          />
        )}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#e50914" />
            <Text style={styles.loadingText}>Loading video...</Text>
            {canUseIframeFallback && (
              <TouchableOpacity style={styles.skipButton} onPress={switchToIframe}>
                <Text style={styles.skipButtonText}>Skip to iframe player</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </div>
    </View>
  );
}

const containerStyles: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
};


const iframeStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  backgroundColor: '#000',
};

const videoStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  backgroundColor: '#000',
  objectFit: 'fill',
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  skipButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipButtonText: {
    color: '#888',
    fontSize: 12,
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
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  iframeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e50914',
    borderRadius: 4,
  },
  iframeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  iframeNotice: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    padding: 8,
  },
  iframeNoticeText: {
    color: '#ffb3b3',
    fontSize: 12,
    textAlign: 'center',
  },
});
