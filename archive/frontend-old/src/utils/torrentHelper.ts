/**
 * Torrent Helper Utilities
 * 
 * Helper functions for handling torrent magnets and external apps
 */

import { Linking, Alert, Platform } from 'react-native';

/**
 * Open magnet link in external torrent client
 */
export const openMagnetLink = async (magnet: string, animeName?: string): Promise<boolean> => {
  try {
    const supported = await Linking.canOpenURL(magnet);
    
    if (supported) {
      Alert.alert(
        'Open in Torrent Client',
        `Open "${animeName || 'this anime'}" in your torrent client?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open', 
            onPress: async () => {
              await Linking.openURL(magnet);
            }
          }
        ]
      );
      return true;
    } else {
      Alert.alert(
        'No Torrent Client',
        'Please install a torrent client app to download torrents.\n\nRecommended apps:\n- µTorrent\n- BitTorrent\n- Flud (Android)\n- iTransmission (iOS)',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('Error opening magnet link:', error);
    Alert.alert('Error', 'Could not open torrent client');
    return false;
  }
};

/**
 * Copy magnet link to clipboard
 */
export const copyMagnetLink = async (magnet: string): Promise<void> => {
  try {
    // Note: Clipboard requires @react-native-clipboard/clipboard
    // For now, we'll use a simple alert
    Alert.alert(
      'Magnet Link',
      magnet,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'Open', 
          onPress: () => Linking.openURL(magnet)
        }
      ]
    );
  } catch (error) {
    console.error('Error copying magnet:', error);
  }
};

/**
 * Get torrent client recommendations based on platform
 */
export const getTorrentClientRecommendations = (): string[] => {
  if (Platform.OS === 'android') {
    return [
      'Flud - Torrent Downloader',
      'µTorrent',
      'BitTorrent',
      'LibreTorrent'
    ];
  } else if (Platform.OS === 'ios') {
    return [
      'iTransmission',
      'iTorrent',
      'Torrent Manager'
    ];
  } else {
    return [
      'µTorrent Web',
      'BitTorrent Web',
      'WebTorrent Desktop'
    ];
  }
};

/**
 * Show torrent info dialog
 */
export const showTorrentInfo = (
  title: string,
  seeders: number,
  leechers: number,
  size: string,
  quality: string
): void => {
  Alert.alert(
    'Torrent Information',
    `${title}\n\n` +
    `🌱 Seeders: ${seeders}\n` +
    `📥 Leechers: ${leechers}\n` +
    `📦 Size: ${size}\n` +
    `🎬 Quality: ${quality}\n\n` +
    `Note: Use external torrent client to download`,
    [{ text: 'OK' }]
  );
};

/**
 * Format torrent info for display
 */
export const formatTorrentInfo = (
  seeders: number,
  leechers: number,
  size: string
): string => {
  const health = seeders >= 10 ? '🟢' : seeders >= 5 ? '🟡' : '🔴';
  return `${health} ${seeders}↑ ${leechers}↓ • ${size}`;
};

/**
 * Check if torrent is healthy
 */
export const checkTorrentHealth = (seeders: number): {
  isHealthy: boolean;
  color: string;
  message: string;
} => {
  if (seeders >= 10) {
    return {
      isHealthy: true,
      color: '#4CAF50',
      message: 'Excellent'
    };
  } else if (seeders >= 5) {
    return {
      isHealthy: true,
      color: '#FFC107',
      message: 'Good'
    };
  } else if (seeders >= 2) {
    return {
      isHealthy: false,
      color: '#FF9800',
      message: 'Poor'
    };
  } else {
    return {
      isHealthy: false,
      color: '#F44336',
      message: 'Very Poor'
    };
  }
};

