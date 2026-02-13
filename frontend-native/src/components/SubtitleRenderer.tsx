import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

export interface SubtitleTrack {
  url: string;
  lang: string;
  label?: string;
}

export interface SubtitleSettings {
  fontSize: 'small' | 'medium' | 'large';
  backgroundColor: 'transparent' | 'semi' | 'solid';
}

interface SubtitleRendererProps {
  currentTime: number;
  subtitleUrl: string | null;
  settings?: SubtitleSettings;
  style?: any;
}

// Parse VTT timestamp to seconds
function parseVttTime(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  let hours = 0, minutes = 0, seconds = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2].replace(',', '.'));
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1].replace(',', '.'));
  }

  return hours * 3600 + minutes * 60 + seconds;
}

// Parse ASS timestamp to seconds (format: H:MM:SS.CC)
function parseAssTime(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);

  return hours * 3600 + minutes * 60 + seconds;
}

// Clean ASS text of style tags
function cleanAssText(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, '') // Remove ASS style tags like {\an8}
    .replace(/\\N/g, '\n')      // Convert \N to newline
    .replace(/\\n/g, '\n')      // Convert \n to newline
    .replace(/\\h/g, ' ')       // Convert \h to space
    .trim();
}

// Parse VTT format
function parseVtt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = content.split('\n');
  let i = 0;

  // Skip header
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    // Look for timestamp line
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->');
      const startTime = parseVttTime(startStr);
      const endTime = parseVttTime(endStr.split(' ')[0]); // Remove position info

      // Collect text lines
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }

      if (textLines.length > 0) {
        cues.push({
          startTime,
          endTime,
          text: textLines.join('\n').replace(/<[^>]+>/g, ''), // Remove HTML tags
        });
      }
    }
    i++;
  }

  return cues;
}

// Parse ASS/SSA format
function parseAss(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = content.split('\n');

  let inEvents = false;
  let formatOrder: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '[Events]') {
      inEvents = true;
      continue;
    }

    if (trimmedLine.startsWith('[') && trimmedLine !== '[Events]') {
      inEvents = false;
      continue;
    }

    if (!inEvents) continue;

    // Parse Format line
    if (trimmedLine.startsWith('Format:')) {
      formatOrder = trimmedLine
        .substring(7)
        .split(',')
        .map(s => s.trim().toLowerCase());
      continue;
    }

    // Parse Dialogue lines
    if (trimmedLine.startsWith('Dialogue:')) {
      const dialoguePart = trimmedLine.substring(9);
      const parts = dialoguePart.split(',');

      // Find indices based on format
      const startIdx = formatOrder.indexOf('start');
      const endIdx = formatOrder.indexOf('end');
      const textIdx = formatOrder.indexOf('text');

      if (startIdx === -1 || endIdx === -1 || textIdx === -1) {
        // Use default positions if format not found
        if (parts.length >= 10) {
          const startTime = parseAssTime(parts[1]);
          const endTime = parseAssTime(parts[2]);
          const text = cleanAssText(parts.slice(9).join(','));

          if (text) {
            cues.push({ startTime, endTime, text });
          }
        }
      } else {
        const startTime = parseAssTime(parts[startIdx]);
        const endTime = parseAssTime(parts[endIdx]);
        // Text field might contain commas, so join everything from textIdx onwards
        const text = cleanAssText(parts.slice(textIdx).join(','));

        if (text) {
          cues.push({ startTime, endTime, text });
        }
      }
    }
  }

  return cues;
}

// Detect format and parse
function parseSubtitles(content: string, url: string): SubtitleCue[] {
  const isAss = url.toLowerCase().endsWith('.ass') ||
                url.toLowerCase().endsWith('.ssa') ||
                content.includes('[Script Info]');

  if (isAss) {
    return parseAss(content);
  }

  return parseVtt(content);
}

const defaultSettings: SubtitleSettings = {
  fontSize: 'medium',
  backgroundColor: 'semi',
};

export function SubtitleRenderer({ currentTime, subtitleUrl, settings = defaultSettings, style }: SubtitleRendererProps) {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [currentText, setCurrentText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, SubtitleCue[]>>(new Map());

  // Font size mapping
  const fontSizeMap = {
    small: Platform.OS === 'web' ? 14 : 12,
    medium: Platform.OS === 'web' ? 18 : 16,
    large: Platform.OS === 'web' ? 24 : 20,
  };

  // Background opacity mapping
  const backgroundMap = {
    transparent: 'transparent',
    semi: 'rgba(0, 0, 0, 0.75)',
    solid: 'rgba(0, 0, 0, 0.95)',
  };

  // Fetch and parse subtitles
  useEffect(() => {
    if (!subtitleUrl) {
      setCues([]);
      setCurrentText('');
      return;
    }

    // Check cache first
    const cached = cacheRef.current.get(subtitleUrl);
    if (cached) {
      setCues(cached);
      return;
    }

    const fetchSubtitles = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(subtitleUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch subtitles: ${response.status}`);
        }

        const content = await response.text();
        const parsedCues = parseSubtitles(content, subtitleUrl);

        // Sort by start time
        parsedCues.sort((a, b) => a.startTime - b.startTime);

        // Cache the result
        cacheRef.current.set(subtitleUrl, parsedCues);

        setCues(parsedCues);
        console.log(`Parsed ${parsedCues.length} subtitle cues`);
      } catch (err: any) {
        console.error('Error loading subtitles:', err);
        setError(err.message);
        setCues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubtitles();
  }, [subtitleUrl]);

  // Find current subtitle based on time
  useEffect(() => {
    if (cues.length === 0) {
      setCurrentText('');
      return;
    }

    // Binary search for current cue
    let left = 0;
    let right = cues.length - 1;
    let foundCue: SubtitleCue | null = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const cue = cues[mid];

      if (currentTime >= cue.startTime && currentTime <= cue.endTime) {
        foundCue = cue;
        break;
      } else if (currentTime < cue.startTime) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // Also check for overlapping cues (linear scan near current position)
    if (!foundCue) {
      for (const cue of cues) {
        if (currentTime >= cue.startTime && currentTime <= cue.endTime) {
          foundCue = cue;
          break;
        }
        if (cue.startTime > currentTime + 10) {
          break; // No need to check further
        }
      }
    }

    setCurrentText(foundCue?.text || '');
  }, [currentTime, cues]);

  if (!subtitleUrl || !currentText) {
    return null;
  }

  const fontSize = fontSizeMap[settings.fontSize];
  const backgroundColor = backgroundMap[settings.backgroundColor];
  const lineHeight = fontSize * 1.4;

  return (
    <View style={[styles.container, { pointerEvents: 'none' }, style]}>
      <View style={[
        styles.textContainer,
        { backgroundColor },
        settings.backgroundColor === 'transparent' && styles.textContainerTransparent,
      ]}>
        <Text style={[
          styles.subtitleText,
          { fontSize, lineHeight },
        ]}>
          {currentText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'web' ? 60 : 80,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  textContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    maxWidth: '90%',
  },
  textContainerTransparent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  subtitleText: {
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
    ...Platform.select({
      web: {
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9), -1px -1px 2px rgba(0, 0, 0, 0.9)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.9)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
      },
    }),
  },
});
