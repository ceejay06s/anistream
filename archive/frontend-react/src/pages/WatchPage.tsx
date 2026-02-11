import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { streamingApi, StreamingData } from '../services/api';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/themes/dist/sea/index.css';
import { API_BASE_URL } from '../services/api';
import './WatchPage.css';

export function WatchPage() {
  const [searchParams] = useSearchParams();
  const animeId = searchParams.get('id');
  const ep = searchParams.get('ep');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingData, setStreamingData] = useState<StreamingData | null>(null);
  const [useEmbed, setUseEmbed] = useState(false);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (animeId) {
      loadSources();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [animeId, ep]);

  const loadSources = async () => {
    if (!animeId) return;

    try {
      setLoading(true);
      setError(null);
      setUseEmbed(false);

      const epNumber = ep || '1';
      const cleanAnimeId = animeId.includes('?') ? animeId.split('?')[0] : animeId;
      const episodeId = `${cleanAnimeId}?ep=${epNumber}`;

      console.log('Loading sources with fallback for:', episodeId);

      // Try to get video sources with automatic server fallback
      const data = await streamingApi.getSources(episodeId, 'hd-1', 'sub', true);

      if (data && data.sources && data.sources.length > 0) {
        console.log(`Got ${data.sources.length} sources, using direct video playback`);
        setStreamingData(data);
        setCurrentSourceIndex(0);
      } else {
        console.log('No direct sources available, switching to embed fallback...');
        switchToEmbedFallback();
      }
    } catch (err: any) {
      console.error('Error loading sources:', err);
      // Switch to embed as fallback
      switchToEmbedFallback();
    } finally {
      setLoading(false);
    }
  };

  const switchToEmbedFallback = () => {
    console.log('Switching to hianime.to embed fallback...');
    setUseEmbed(true);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="watch-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading video player...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="watch-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button className="retry-button" onClick={loadSources}>
            Retry
          </button>
          {animeId && (
            <Link to={`/detail/${animeId}`} className="back-button">
              ← Back to Anime
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Initialize Video.js player when streaming data is available
  useEffect(() => {
    if (useEmbed || !streamingData || !videoRef.current || playerRef.current) return;

    const timer = setTimeout(() => {
      if (videoRef.current && videoRef.current.isConnected) {
        initializePlayer();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [streamingData, currentSourceIndex, useEmbed]);

  const tryNextSource = () => {
    if (!streamingData) return;

    const nextIndex = currentSourceIndex + 1;
    if (nextIndex >= streamingData.sources.length) {
      // All sources failed, switch to embed fallback
      switchToEmbedFallback();
      return;
    }

    setCurrentSourceIndex(nextIndex);
    const nextSource = streamingData.sources[nextIndex];
    setError(null);

    if (playerRef.current) {
      playerRef.current.src({
        src: nextSource.url,
        type: nextSource.isM3U8 ? 'application/x-mpegURL' : 'video/mp4',
      });
      playerRef.current.load();
    }
  };

  const initializePlayer = () => {
    if (!videoRef.current || !streamingData) return;

    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    const currentSource = streamingData.sources[currentSourceIndex] || streamingData.sources[0];

    const player = videojs(videoRef.current, {
      controls: true,
      responsive: true,
      fluid: true,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      sources: [
        {
          src: currentSource.url,
          type: currentSource.isM3U8 ? 'application/x-mpegURL' : 'video/mp4',
        },
      ],
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false,
      },
    }, () => {
      console.log('Video.js player ready');

      if (streamingData.tracks && streamingData.tracks.length > 0) {
        streamingData.tracks.forEach((track) => {
          player.addRemoteTextTrack({
            kind: 'subtitles',
            src: track.url,
            srclang: track.lang,
            label: track.lang.toUpperCase(),
            default: track.lang === 'en',
          }, false);
        });
      }

      if (currentSource.isM3U8) {
        try {
          const tech = player.tech({ IWillNotUseThisInPlugins: true });
          if (tech && (tech as any).vhs) {
            const vhs = (tech as any).vhs;
            if (vhs.xhr) {
              const originalBeforeRequest = vhs.xhr.beforeRequest;
              vhs.xhr.beforeRequest = (options: any) => {
                const originalUri = options.uri;

                if (originalUri && !originalUri.includes('/api/streaming/proxy')) {
                  const needsProxy = originalUri.startsWith('http://') || originalUri.startsWith('https://');
                  if (needsProxy) {
                    const proxyUrl = `${API_BASE_URL}/api/streaming/proxy?url=${encodeURIComponent(originalUri)}`;
                    options.uri = proxyUrl;
                  }
                }

                if (!options.headers) {
                  options.headers = {};
                }

                options.headers['Referer'] = 'https://hianime.to/';

                if (originalBeforeRequest) {
                  return originalBeforeRequest.call(vhs.xhr, options);
                }
                return options;
              };
            }
          }
        } catch (e) {
          console.warn('Could not set up HLS proxy:', e);
        }
      }
    });

    playerRef.current = player;

    player.on('error', () => {
      const error = player.error();
      if (error) {
        console.error('Video.js error:', error);
        const isBlockedError = error.code === 2 || error.code === 4 ||
          error.message?.includes('403') || error.message?.includes('Forbidden');

        if (isBlockedError && currentSourceIndex < streamingData.sources.length - 1) {
          setTimeout(() => tryNextSource(), 1500);
          return;
        }

        if (currentSourceIndex >= streamingData.sources.length - 1) {
          switchToEmbedFallback();
        }
      }
    });

    player.on('loadstart', () => setLoading(true));
    player.on('canplay', () => setLoading(false));
  };

  // Use hianime.to embed iframe as fallback
  if (useEmbed) {
    const cleanAnimeId = animeId?.includes('?') ? animeId.split('?')[0] : animeId;
    const iframeSrc = `https://hianime.to/watch/${cleanAnimeId}?ep=${ep || '1'}`;

    return (
      <div className="watch-page">
        <div className="watch-header">
          {animeId && (
            <Link to={`/detail/${animeId}`} className="back-link">
              ← Back
            </Link>
          )}
          <h2 className="episode-title">Episode {ep || '1'}</h2>
        </div>
        <div className="video-container">
          <div className="iframe-fallback">
            <iframe
              src={iframeSrc}
              className="video-iframe"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              referrerPolicy="origin"
              title={`Episode ${ep || '1'}`}
            />
            <p className="iframe-notice">Playing via hianime.to</p>
          </div>
        </div>
      </div>
    );
  }

  // Video.js player
  if (!streamingData || streamingData.sources.length === 0) {
    if (!loading) {
      return (
        <div className="watch-page">
          <div className="error-container">
            <h2>No Video Sources</h2>
            <p>No video sources available for this episode.</p>
            {animeId && (
              <Link to={`/detail/${animeId}`} className="back-button">
                ← Back to Anime
              </Link>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="watch-page">
      <div className="watch-header">
        {animeId && (
          <Link to={`/detail/${animeId}`} className="back-link">
            ← Back
          </Link>
        )}
        <h2 className="episode-title">Episode {ep || '1'}</h2>
      </div>

      <div className="video-container">
        <div data-vjs-player>
          <video ref={videoRef} className="video-js vjs-theme-sea" />
        </div>

        {streamingData.sources.length > 1 && (
          <div className="quality-selector-container">
            <label htmlFor="quality-select">Quality:</label>
            <select
              id="quality-select"
              onChange={(e) => {
                const selectedUrl = e.target.value;
                const newSource = streamingData.sources.find(s => s.url === selectedUrl);
                if (newSource && playerRef.current) {
                  playerRef.current.src({
                    src: newSource.url,
                    type: newSource.isM3U8 ? 'application/x-mpegURL' : 'video/mp4',
                  });
                  playerRef.current.play();
                }
              }}
              value={playerRef.current?.currentSrc() || streamingData.sources[0].url}
            >
              {streamingData.sources.map((source, index) => (
                <option key={index} value={source.url}>
                  {source.quality} {source.isM3U8 && '(HLS)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="buffering-indicator">
            <div className="loading-spinner"></div>
            <p>Buffering...</p>
          </div>
        )}

        {error && (
          <div className="video-error-message">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
