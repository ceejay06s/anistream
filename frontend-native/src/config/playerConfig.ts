export type PlayerScriptVersion = 'v1' | 'v2';

export const PLAYER_SCRIPT_URLS: Record<PlayerScriptVersion, string> = {
  v1: 'https://megacloud.club/js/player/a/e1-player.min.js',
  v2: 'https://rapid-cloud.co/js/player/prod/e6-player-v2.min.js',
};

export const DEFAULT_PLAYER_SCRIPT_VERSION: PlayerScriptVersion = 'v2';

export const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

// Use bundled asset instead of an inlined base64 data URL to keep bundle/source smaller.
export const PLAYER_PLACEHOLDER_IMAGE = require('../../assets/logo-w-text.png');

function normalizeVersion(version?: string | null): PlayerScriptVersion {
  return version === 'v1' || version === 'v2' ? version : DEFAULT_PLAYER_SCRIPT_VERSION;
}

export function getConfiguredPlayerVersion(): PlayerScriptVersion {
  return normalizeVersion(process.env.EXPO_PUBLIC_PLAYER_SCRIPT_VERSION);
}

export function getPlayerScriptUrl(version?: PlayerScriptVersion): string {
  const selected = version || getConfiguredPlayerVersion();
  return PLAYER_SCRIPT_URLS[selected];
}

export function getPlayerScriptFallbackUrls(
  preferredVersion?: PlayerScriptVersion
): string[] {
  const preferred = preferredVersion || getConfiguredPlayerVersion();
  const secondary: PlayerScriptVersion = preferred === 'v2' ? 'v1' : 'v2';
  return [PLAYER_SCRIPT_URLS[preferred], PLAYER_SCRIPT_URLS[secondary]];
}
