/**
 * Video Extraction and Decryption Service
 * Handles encrypted video sources from various anime streaming servers
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import CryptoJS from 'crypto-js';

export interface ExtractedVideo {
  url: string;
  quality: string;
  isM3U8: boolean;
  headers?: Record<string, string>;
}

export interface SubtitleTrack {
  url: string;
  lang: string;
  label: string;
}

export interface VideoData {
  sources: ExtractedVideo[];
  subtitles: SubtitleTrack[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

/**
 * GogoPlay/Vidstreaming Extractor
 */
export class GogoPlayExtractor {
  private keys = {
    key: CryptoJS.enc.Utf8.parse('37911490979715163134003223491201'),
    secondKey: CryptoJS.enc.Utf8.parse('54674138327930866480207815084989'),
    iv: CryptoJS.enc.Utf8.parse('3134003223491201'),
  };

  async extract(serverUrl: string): Promise<VideoData> {
    try {
      console.log('🔓 Extracting from GogoPlay:', serverUrl);

      const response = await axios.get(serverUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://gogoplay.io/',
        },
      });

      const $ = cheerio.load(response.data);

      // Find encrypted data
      const encryptedParams = this.extractEncryptedData($);

      if (!encryptedParams) {
        console.error('No encrypted data found');
        return { sources: [], subtitles: [] };
      }

      // Decrypt the data
      const decryptedData = this.decrypt(encryptedParams);
      const sourceUrl = this.extractSourceUrl(decryptedData);

      if (!sourceUrl) {
        console.error('Failed to extract source URL');
        return { sources: [], subtitles: [] };
      }

      // Get M3U8 sources
      const sources = await this.extractM3U8Qualities(sourceUrl);

      console.log(`✓ Extracted ${sources.length} sources from GogoPlay`);

      return {
        sources,
        subtitles: [],
      };
    } catch (error: any) {
      console.error('GogoPlay extraction error:', error.message);
      return { sources: [], subtitles: [] };
    }
  }

  private extractEncryptedData($: cheerio.CheerioAPI): string | null {
    // Look for encrypted Ajax parameters
    const scriptText = $('script[data-name="episode"]').attr('data-value');
    if (scriptText) return scriptText;

    // Alternative: Find in inline scripts
    let encryptedString: string | null = null;
    $('script').each((_, script) => {
      const content = $(script).html() || '';
      const match = content.match(/data-value="([^"]+)"/);
      if (match) {
        encryptedString = match[1];
        return false; // break
      }
    });

    return encryptedString;
  }

  private decrypt(encrypted: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.keys.key, {
        iv: this.keys.iv,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  private extractSourceUrl(decryptedData: string): string | null {
    try {
      // The decrypted data usually contains URL parameters
      const match = decryptedData.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
      return match ? match[0] : null;
    } catch (error) {
      console.error('Source URL extraction error:', error);
      return null;
    }
  }

  private async extractM3U8Qualities(m3u8Url: string): Promise<ExtractedVideo[]> {
    try {
      const response = await axios.get(m3u8Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://gogoplay.io/',
        },
      });

      const content = response.data;
      const sources: ExtractedVideo[] = [];

      // Parse M3U8 master playlist
      if (content.includes('#EXT-X-STREAM-INF')) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
            const resolutionMatch = lines[i].match(/RESOLUTION=\d+x(\d+)/);
            const quality = resolutionMatch ? `${resolutionMatch[1]}p` : 'auto';

            const urlLine = lines[i + 1]?.trim();
            if (urlLine && !urlLine.startsWith('#')) {
              const fullUrl = urlLine.startsWith('http')
                ? urlLine
                : new URL(urlLine, m3u8Url).href;

              sources.push({
                url: fullUrl,
                quality,
                isM3U8: true,
                headers: {
                  'Referer': 'https://gogoplay.io/',
                  'Origin': 'https://gogoplay.io',
                },
              });
            }
          }
        }
      } else {
        // Single quality M3U8
        sources.push({
          url: m3u8Url,
          quality: 'default',
          isM3U8: true,
          headers: {
            'Referer': 'https://gogoplay.io/',
            'Origin': 'https://gogoplay.io',
          },
        });
      }

      return sources;
    } catch (error) {
      console.error('M3U8 parsing error:', error);
      return [
        {
          url: m3u8Url,
          quality: 'default',
          isM3U8: true,
        },
      ];
    }
  }
}

/**
 * Kwik Extractor (Used by AnimePahe)
 */
export class KwikExtractor {
  async extract(kwikUrl: string): Promise<VideoData> {
    try {
      console.log('🔓 Extracting from Kwik:', kwikUrl);

      const response = await axios.get(kwikUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://animepahe.com/',
        },
      });

      const $ = cheerio.load(response.data);

      // Extract the download URL from the page
      let downloadUrl: string | null = null;

      // Method 1: Look for direct download button
      $('a.btn').each((_, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('.mp4') || href.includes('download'))) {
          downloadUrl = href;
          return false;
        }
      });

      // Method 2: Find in scripts
      if (!downloadUrl) {
        $('script').each((_, script) => {
          const content = $(script).html() || '';
          const match = content.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/);
          if (match) {
            downloadUrl = match[0];
            return false;
          }
        });
      }

      if (!downloadUrl) {
        console.error('Failed to extract Kwik download URL');
        return { sources: [], subtitles: [] };
      }

      console.log('✓ Extracted Kwik source');

      return {
        sources: [
          {
            url: downloadUrl,
            quality: 'default',
            isM3U8: false,
            headers: {
              'Referer': 'https://kwik.cx/',
            },
          },
        ],
        subtitles: [],
      };
    } catch (error: any) {
      console.error('Kwik extraction error:', error.message);
      return { sources: [], subtitles: [] };
    }
  }
}

/**
 * RapidCloud Extractor (Used by Zoro/AniWatch)
 */
export class RapidCloudExtractor {
  async extract(rapidCloudUrl: string): Promise<VideoData> {
    try {
      console.log('🔓 Extracting from RapidCloud:', rapidCloudUrl);

      // Get the embed ID from URL
      const embedId = rapidCloudUrl.split('/').pop()?.split('?')[0];
      if (!embedId) {
        throw new Error('Invalid RapidCloud URL');
      }

      // Call RapidCloud API
      const apiUrl = `https://rapid-cloud.co/ajax/embed-6/getSources?id=${embedId}`;

      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': rapidCloudUrl,
        },
      });

      const data = response.data;
      const sources: ExtractedVideo[] = [];
      const subtitles: SubtitleTrack[] = [];

      // Extract sources
      if (data.sources) {
        for (const source of data.sources) {
          sources.push({
            url: source.file,
            quality: source.label || 'auto',
            isM3U8: source.file.includes('.m3u8'),
            headers: {
              'Referer': 'https://rapid-cloud.co/',
            },
          });
        }
      }

      // Extract subtitles
      if (data.tracks) {
        for (const track of data.tracks) {
          if (track.kind === 'captions') {
            subtitles.push({
              url: track.file,
              lang: track.label,
              label: track.label,
            });
          }
        }
      }

      // Extract intro/outro if available
      const intro = data.intro
        ? { start: data.intro.start, end: data.intro.end }
        : undefined;
      const outro = data.outro
        ? { start: data.outro.start, end: data.outro.end }
        : undefined;

      console.log(`✓ Extracted ${sources.length} sources from RapidCloud`);

      return {
        sources,
        subtitles,
        intro,
        outro,
      };
    } catch (error: any) {
      console.error('RapidCloud extraction error:', error.message);
      return { sources: [], subtitles: [] };
    }
  }
}

/**
 * Universal Video Extractor
 */
export class UniversalVideoExtractor {
  private gogoPlay = new GogoPlayExtractor();
  private kwik = new KwikExtractor();
  private rapidCloud = new RapidCloudExtractor();

  async extract(url: string): Promise<VideoData> {
    console.log('🎥 Extracting video from:', url);

    // Detect server type and use appropriate extractor
    if (url.includes('gogoplay') || url.includes('vidstreaming')) {
      return this.gogoPlay.extract(url);
    } else if (url.includes('kwik')) {
      return this.kwik.extract(url);
    } else if (url.includes('rapid-cloud') || url.includes('rabbitstream')) {
      return this.rapidCloud.extract(url);
    } else if (url.endsWith('.m3u8')) {
      // Direct M3U8 link
      return {
        sources: [{ url, quality: 'auto', isM3U8: true }],
        subtitles: [],
      };
    } else if (url.endsWith('.mp4')) {
      // Direct MP4 link
      return {
        sources: [{ url, quality: 'auto', isM3U8: false }],
        subtitles: [],
      };
    }

    console.warn('Unknown server type, returning direct URL');
    return {
      sources: [{ url, quality: 'auto', isM3U8: url.includes('.m3u8') }],
      subtitles: [],
    };
  }

  /**
   * Extract with fallback to multiple methods
   */
  async extractWithFallback(urls: string[]): Promise<VideoData | null> {
    for (const url of urls) {
      try {
        const result = await this.extract(url);
        if (result.sources.length > 0) {
          return result;
        }
      } catch (error) {
        console.log(`Failed to extract from ${url}, trying next...`);
      }
    }

    return null;
  }
}

// Export singleton
export const videoExtractor = new UniversalVideoExtractor();

/**
 * Convenience function
 */
export const extractVideoSources = (url: string) => videoExtractor.extract(url);

export const extractWithFallback = (urls: string[]) =>
  videoExtractor.extractWithFallback(urls);
