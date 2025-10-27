/**
 * Torrent Streaming Service
 * 
 * Client service to interact with backend torrent streaming server
 */

const TORRENT_SERVER_URL = 'http://localhost:3001'; // Change to your server IP

export interface TorrentInfo {
  infoHash: string;
  name: string;
  files: Array<{
    name: string;
    length: number;
    path: string;
  }>;
  videoFile: {
    name: string;
    index: number;
  };
}

export interface TorrentStats {
  name: string;
  infoHash: string;
  progress: string;
  downloadSpeed: string;
  uploadSpeed: string;
  numPeers: number;
  downloaded: string;
  uploaded: string;
  length: string;
  timeRemaining: number;
  done: boolean;
}

/**
 * Check if torrent server is running
 */
export const checkTorrentServerStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(TORRENT_SERVER_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.status === 'running';
  } catch (error) {
    console.error('Torrent server not reachable:', error);
    return false;
  }
};

/**
 * Add torrent to server and get video file info
 */
export const addTorrent = async (magnet: string): Promise<TorrentInfo | null> => {
  try {
    console.log('Adding torrent to server...');
    
    const response = await fetch(`${TORRENT_SERVER_URL}/api/torrent/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ magnet }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add torrent');
    }
    
    const data = await response.json();
    console.log('Torrent added:', data.name);
    
    return data;
  } catch (error) {
    console.error('Error adding torrent:', error);
    return null;
  }
};

/**
 * Get stream URL for torrent video
 */
export const getTorrentStreamUrl = (
  infoHash: string,
  fileIndex: number
): string => {
  return `${TORRENT_SERVER_URL}/api/torrent/stream/${infoHash}/${fileIndex}`;
};

/**
 * Get torrent download/upload stats
 */
export const getTorrentStats = async (infoHash: string): Promise<TorrentStats | null> => {
  try {
    const response = await fetch(`${TORRENT_SERVER_URL}/api/torrent/stats/${infoHash}`);
    
    if (!response.ok) {
      throw new Error('Failed to get stats');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting torrent stats:', error);
    return null;
  }
};

/**
 * Remove torrent from server
 */
export const removeTorrent = async (infoHash: string): Promise<boolean> => {
  try {
    const response = await fetch(`${TORRENT_SERVER_URL}/api/torrent/remove/${infoHash}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove torrent');
    }
    
    console.log('Torrent removed');
    return true;
  } catch (error) {
    console.error('Error removing torrent:', error);
    return false;
  }
};

/**
 * List all active torrents
 */
export const listActiveTorrents = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${TORRENT_SERVER_URL}/api/torrent/list`);
    
    if (!response.ok) {
      throw new Error('Failed to list torrents');
    }
    
    const data = await response.json();
    return data.torrents || [];
  } catch (error) {
    console.error('Error listing torrents:', error);
    return [];
  }
};

/**
 * Poll torrent stats until ready to play
 */
export const waitForTorrentReady = async (
  infoHash: string,
  onProgress?: (progress: number) => void,
  minProgress: number = 5 // Wait for 5% to start streaming
): Promise<boolean> => {
  return new Promise((resolve) => {
    const checkInterval = setInterval(async () => {
      const stats = await getTorrentStats(infoHash);
      
      if (!stats) {
        clearInterval(checkInterval);
        resolve(false);
        return;
      }
      
      const progress = parseFloat(stats.progress);
      
      if (onProgress) {
        onProgress(progress);
      }
      
      console.log(`Torrent progress: ${progress}%`);
      
      if (progress >= minProgress || stats.done) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 1000); // Check every second
    
    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 120000);
  });
};

/**
 * Stream torrent with automatic server management
 */
export const streamTorrent = async (
  magnet: string,
  onProgress?: (progress: number) => void
): Promise<{
  streamUrl: string;
  infoHash: string;
  torrentInfo: TorrentInfo;
} | null> => {
  try {
    // Check if server is running
    const serverRunning = await checkTorrentServerStatus();
    
    if (!serverRunning) {
      console.error('Torrent server is not running');
      return null;
    }
    
    // Add torrent
    const torrentInfo = await addTorrent(magnet);
    
    if (!torrentInfo) {
      console.error('Failed to add torrent');
      return null;
    }
    
    // Wait for torrent to buffer
    console.log('Buffering torrent...');
    const ready = await waitForTorrentReady(
      torrentInfo.infoHash,
      onProgress,
      5 // 5% buffer
    );
    
    if (!ready) {
      console.error('Torrent not ready');
      return null;
    }
    
    // Get stream URL
    const streamUrl = getTorrentStreamUrl(
      torrentInfo.infoHash,
      torrentInfo.videoFile.index
    );
    
    console.log('Stream URL ready:', streamUrl);
    
    return {
      streamUrl,
      infoHash: torrentInfo.infoHash,
      torrentInfo,
    };
  } catch (error) {
    console.error('Error streaming torrent:', error);
    return null;
  }
};

/**
 * Format server URL (helper for configuration)
 */
export const configureTorrentServer = (host: string, port: number = 3001): void => {
  // This would update the TORRENT_SERVER_URL
  // In production, you'd want to store this in AsyncStorage or config
  console.log(`Torrent server configured: http://${host}:${port}`);
};

/**
 * Get server URL
 */
export const getTorrentServerUrl = (): string => {
  return TORRENT_SERVER_URL;
};

