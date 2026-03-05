import { useState, useEffect, useRef } from 'react';
import { AnimeInfo } from '@/services/api';
import { watchHistoryService } from '@/services/watchHistoryService';

interface UseWatchProgressParams {
  animeId: string | undefined;
  episodeNumber: string;
  fullEpisodeId: string;
  animeInfo: AnimeInfo | null;
  currentVideoTime: number;
}

interface UseWatchProgressResult {
  resumeTimestamp: number | null;
  showResumePrompt: boolean;
  handleResumeYes: () => void;
  handleResumeNo: () => void;
}

export function useWatchProgress({
  animeId,
  episodeNumber,
  fullEpisodeId,
  animeInfo,
  currentVideoTime,
}: UseWatchProgressParams): UseWatchProgressResult {
  const [resumeTimestamp, setResumeTimestamp] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const lastSavedTimeRef = useRef<number>(0);
  const saveProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep a ref to avoid stale closure in the auto-save interval
  const currentTimeRef = useRef(currentVideoTime);
  useEffect(() => {
    currentTimeRef.current = currentVideoTime;
  }, [currentVideoTime]);

  // Also keep animeInfo in a ref so the auto-save interval always has the latest value
  const animeInfoRef = useRef(animeInfo);
  useEffect(() => {
    animeInfoRef.current = animeInfo;
  }, [animeInfo]);

  const saveWatchProgress = async (time: number) => {
    if (!animeId || time < 10) return;
    try {
      await watchHistoryService.saveProgress({
        animeId,
        animeName: animeInfoRef.current?.name || animeId.replace(/-/g, ' '),
        animePoster: animeInfoRef.current?.poster,
        episodeId: fullEpisodeId,
        episodeNumber,
        timestamp: time,
      });
    } catch (err) {
      console.error('Failed to save watch progress:', err);
    }
  };

  // Load watch history and show resume prompt
  useEffect(() => {
    if (!animeId || !episodeNumber) return;

    const loadWatchProgress = async () => {
      try {
        const progress = await watchHistoryService.getProgress(animeId, episodeNumber);
        if (progress && progress.timestamp > 30) {
          setResumeTimestamp(progress.timestamp);
          setShowResumePrompt(true);
        }
      } catch (err) {
        console.error('Failed to load watch progress:', err);
      }
    };

    loadWatchProgress();

    return () => {
      // Save progress when episode changes
      if (currentTimeRef.current > 10 && animeId) {
        saveWatchProgress(currentTimeRef.current);
      }
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
      }
    };
  }, [animeId, episodeNumber]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (saveProgressIntervalRef.current) {
      clearInterval(saveProgressIntervalRef.current);
    }

    saveProgressIntervalRef.current = setInterval(() => {
      const time = currentTimeRef.current;
      if (time > 10 && Math.abs(time - lastSavedTimeRef.current) > 5) {
        saveWatchProgress(time);
        lastSavedTimeRef.current = time;
      }
    }, 10000);

    return () => {
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
      }
    };
  }, [animeId, episodeNumber, fullEpisodeId]);

  const handleResumeYes = () => {
    setShowResumePrompt(false);
  };

  const handleResumeNo = () => {
    setResumeTimestamp(null);
    setShowResumePrompt(false);
  };

  return { resumeTimestamp, showResumePrompt, handleResumeYes, handleResumeNo };
}
