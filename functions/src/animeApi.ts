import * as admin from 'firebase-admin';
import * as https from 'https';
import * as http from 'http';

/**
 * Helper to fetch anime info from your backend API
 * Adapt this to match your actual backend API structure
 */
export async function fetchAnimeInfo(animeId: string): Promise<AnimeInfo | null> {
  return new Promise((resolve) => {
    try {
      // Replace with your actual backend API URL
      const API_BASE_URL = process.env.API_BASE_URL || 'https://anistream-backend-blme.onrender.com';
      const url = `${API_BASE_URL}/api/anime/info/${animeId}`;
      
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.request(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const parsed = JSON.parse(data);
              resolve(parsed.data || null);
            } else {
              console.error(`Failed to fetch anime info for ${animeId}: ${res.statusCode}`);
              resolve(null);
            }
          } catch (error) {
            console.error(`Error parsing response for ${animeId}:`, error);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.error(`Error fetching anime info for ${animeId}:`, error);
        resolve(null);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        console.error(`Timeout fetching anime info for ${animeId}`);
        resolve(null);
      });

      req.end();
    } catch (error) {
      console.error(`Error fetching anime info for ${animeId}:`, error);
      resolve(null);
    }
  });
}

interface AnimeInfo {
  id: string;
  name: string;
  episodes: {
    sub: number | null;
    dub: number | null;
  };
}
