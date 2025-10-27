/**
 * Proxy Service for Web Scraping in React Native
 * 
 * Since React Native can't directly scrape websites due to CORS,
 * we need to use a proxy or backend service.
 * 
 * ⚠️ EDUCATIONAL PURPOSE ONLY ⚠️
 */

// Free CORS proxy services (for educational testing only)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
];

let currentProxyIndex = 0;

/**
 * Fetch HTML through CORS proxy
 */
export const fetchThroughProxy = async (url: string): Promise<string> => {
  const proxy = CORS_PROXIES[currentProxyIndex];
  const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
  
  try {
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Proxy ${proxy} failed, trying next...`);
    
    // Try next proxy
    currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
    
    if (currentProxyIndex === 0) {
      throw new Error('All proxies failed');
    }
    
    return fetchThroughProxy(url);
  }
};

/**
 * Setup your own backend proxy (Recommended for production)
 * 
 * Create a simple Express server:
 * 
 * ```javascript
 * // server.js
 * const express = require('express');
 * const axios = require('axios');
 * const cors = require('cors');
 * 
 * const app = express();
 * app.use(cors());
 * 
 * app.get('/proxy', async (req, res) => {
 *   try {
 *     const { url } = req.query;
 *     const response = await axios.get(url);
 *     res.send(response.data);
 *   } catch (error) {
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 * 
 * app.listen(3001, () => console.log('Proxy running on port 3001'));
 * ```
 */

/**
 * Fetch through your own backend proxy
 */
export const fetchThroughBackend = async (url: string, backendUrl: string = 'http://localhost:3001'): Promise<string> => {
  try {
    const response = await fetch(`${backendUrl}/proxy?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`Backend proxy error! status: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Backend proxy failed:', error);
    throw error;
  }
};

/**
 * Smart fetch: Try backend first, fallback to CORS proxy
 */
export const smartFetch = async (
  url: string, 
  backendUrl?: string
): Promise<string> => {
  // Try backend proxy first
  if (backendUrl) {
    try {
      return await fetchThroughBackend(url, backendUrl);
    } catch (error) {
      console.log('Backend proxy failed, falling back to CORS proxy...');
    }
  }
  
  // Fallback to CORS proxy
  return await fetchThroughProxy(url);
};

/**
 * Fetch with retry logic
 */
export const fetchWithRetry = async (
  url: string,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<string> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await smartFetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
};

/**
 * Cache for fetched HTML to reduce requests
 */
class HTMLCache {
  private cache = new Map<string, { html: string; timestamp: number }>();
  private maxAge = 5 * 60 * 1000; // 5 minutes
  
  get(url: string): string | null {
    const cached = this.cache.get(url);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(url);
      return null;
    }
    
    return cached.html;
  }
  
  set(url: string, html: string): void {
    this.cache.set(url, {
      html,
      timestamp: Date.now(),
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const htmlCache = new HTMLCache();

/**
 * Fetch with caching
 */
export const fetchWithCache = async (url: string): Promise<string> => {
  const cached = htmlCache.get(url);
  if (cached) {
    console.log('Using cached HTML for:', url);
    return cached;
  }
  
  const html = await smartFetch(url);
  htmlCache.set(url, html);
  
  return html;
};

