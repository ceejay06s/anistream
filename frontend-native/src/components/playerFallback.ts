import { Platform } from 'react-native';

interface ShouldRenderPlayerArgs {
  selectedSourceUrl?: string | null;
  iframeFallbackUrl?: string | null;
  platform?: string;
}

export function shouldRenderPlayer({
  selectedSourceUrl,
  iframeFallbackUrl,
  platform,
}: ShouldRenderPlayerArgs): boolean {
  const currentPlatform = platform || Platform.OS;
  const hasSource = Boolean(selectedSourceUrl);
  const hasIframeFallback = Boolean(iframeFallbackUrl);

  // Only web can render iframe fallback.
  if (currentPlatform === 'web') {
    return hasSource || hasIframeFallback;
  }

  return hasSource;
}

interface BuildIframeSourceArgs {
  iframeEmbedUrl?: string | null;
  animeId?: string;
  episodeNumber?: string;
  fullEpisodeId?: string;
}

export function buildIframeSource({
  iframeEmbedUrl,
  animeId,
  episodeNumber,
  fullEpisodeId,
}: BuildIframeSourceArgs): string | null {
  if (iframeEmbedUrl) {
    return iframeEmbedUrl;
  }

  if (!animeId) {
    return null;
  }

  let epId = episodeNumber || '1';
  if (fullEpisodeId && fullEpisodeId.includes('?ep=')) {
    const match = fullEpisodeId.match(/\?ep=(\d+)/);
    if (match) {
      epId = match[1];
    }
  }

  return `https://hianime.to/watch/${animeId}?ep=${epId}`;
}
