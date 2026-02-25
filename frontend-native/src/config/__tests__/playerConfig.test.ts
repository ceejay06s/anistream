import {
  DEFAULT_PLAYER_SCRIPT_VERSION,
  PLAYER_SCRIPT_URLS,
  getConfiguredPlayerVersion,
  getPlayerScriptFallbackUrls,
  getPlayerScriptUrl,
} from '../playerConfig';

describe('playerConfig', () => {
  const originalVersion = process.env.EXPO_PUBLIC_PLAYER_SCRIPT_VERSION;

  afterEach(() => {
    process.env.EXPO_PUBLIC_PLAYER_SCRIPT_VERSION = originalVersion;
  });

  it('returns direct URL for explicit version', () => {
    expect(getPlayerScriptUrl('v1')).toBe(PLAYER_SCRIPT_URLS.v1);
    expect(getPlayerScriptUrl('v2')).toBe(PLAYER_SCRIPT_URLS.v2);
  });

  it('reads configured version from env when valid', () => {
    process.env.EXPO_PUBLIC_PLAYER_SCRIPT_VERSION = 'v1';
    expect(getConfiguredPlayerVersion()).toBe('v1');
    expect(getPlayerScriptUrl()).toBe(PLAYER_SCRIPT_URLS.v1);
  });

  it('falls back to default version when env is invalid', () => {
    process.env.EXPO_PUBLIC_PLAYER_SCRIPT_VERSION = 'v3';
    expect(getConfiguredPlayerVersion()).toBe(DEFAULT_PLAYER_SCRIPT_VERSION);
  });

  it('returns preferred-first fallback URL order', () => {
    expect(getPlayerScriptFallbackUrls('v2')).toEqual([
      PLAYER_SCRIPT_URLS.v2,
      PLAYER_SCRIPT_URLS.v1,
    ]);
    expect(getPlayerScriptFallbackUrls('v1')).toEqual([
      PLAYER_SCRIPT_URLS.v1,
      PLAYER_SCRIPT_URLS.v2,
    ]);
  });
});
