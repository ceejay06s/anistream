import { buildIframeSource, shouldRenderPlayer } from '../playerFallback';

describe('player fallback helpers', () => {
  describe('shouldRenderPlayer', () => {
    it('renders player on web when iframe fallback exists and no direct source', () => {
      expect(
        shouldRenderPlayer({
          selectedSourceUrl: '',
          iframeFallbackUrl: 'https://example.com/embed',
          platform: 'web',
        })
      ).toBe(true);
    });

    it('does not render player on native when only iframe fallback exists', () => {
      expect(
        shouldRenderPlayer({
          selectedSourceUrl: '',
          iframeFallbackUrl: 'https://example.com/embed',
          platform: 'ios',
        })
      ).toBe(false);
    });

    it('renders player on native when direct source exists', () => {
      expect(
        shouldRenderPlayer({
          selectedSourceUrl: 'https://example.com/video.m3u8',
          iframeFallbackUrl: null,
          platform: 'android',
        })
      ).toBe(true);
    });
  });

  describe('buildIframeSource', () => {
    it('prefers backend embed url when available', () => {
      expect(
        buildIframeSource({
          iframeEmbedUrl: 'https://embed.example.com/e/123',
          animeId: 'naruto-1',
          episodeNumber: '5',
        })
      ).toBe('https://embed.example.com/e/123');
    });

    it('builds direct hianime fallback with episode from fullEpisodeId', () => {
      expect(
        buildIframeSource({
          animeId: 'naruto-1',
          episodeNumber: '1',
          fullEpisodeId: 'naruto-1?ep=7',
        })
      ).toBe('https://hianime.to/watch/naruto-1?ep=7');
    });

    it('returns null when no embed url and no animeId', () => {
      expect(
        buildIframeSource({
          iframeEmbedUrl: null,
          animeId: undefined,
          episodeNumber: '2',
        })
      ).toBeNull();
    });
  });
});
