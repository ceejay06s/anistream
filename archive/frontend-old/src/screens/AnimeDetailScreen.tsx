import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchAnimeById } from '../services/metadataApi';
import { getAnimeInfo as getStreamingAnimeInfo, searchAnime as searchStreamingAnime } from '../services/streamingService';
import { Anime, Episode } from '../types';
import { RootStackParamList } from '../navigation/types';

type AnimeDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AnimeDetail'>;
  route: RouteProp<RootStackParamList, 'AnimeDetail'>;
};

const { width } = Dimensions.get('window');

const AnimeDetailScreen: React.FC<AnimeDetailScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { animeId, anime: passedAnime, searchTitle } = route.params as any;
  const [anime, setAnime] = useState<Anime | null>(passedAnime || null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(!passedAnime);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('=== AnimeDetailScreen Debug ===');
    console.log('Anime ID:', animeId);
    console.log('Passed Anime:', passedAnime ? passedAnime.title : 'NO DATA PASSED');
    console.log('Current anime state:', anime ? anime.title : 'null');
    console.log('Loading state:', loading);
    
    // Only fetch if anime data wasn't passed
    if (!passedAnime) {
      console.log('No passed data - fetching from API...');
      loadAnimeDetails();
    } else {
      console.log('Using passed anime data - no API call needed!');
    }
    
  }, [animeId, passedAnime]);

  useEffect(() => {
    if (!anime) {
      return;
    }

    loadEpisodes();
  }, [animeId, anime?.title]);

  const loadAnimeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching anime details for ID:', animeId, 'with search title:', searchTitle);
      const data = await fetchAnimeById(animeId, searchTitle);
      if (data) {
        console.log('Anime data loaded:', data.title);
        setAnime(data);
      } else {
        console.warn('No anime data returned from API');
        // If we had passed data, keep using it
        if (passedAnime) {
          console.log('Using passed anime data instead:', passedAnime.title);
          setAnime(passedAnime);
          setError(null);
        } else {
          setError('Anime not found. This anime may not be available in the database.');
        }
      }
    } catch (err: any) {
      console.error('Error loading anime details:', err);
      // If we had passed data, keep using it even if API fails
      if (passedAnime) {
        console.log('API failed, using passed anime data:', passedAnime.title);
        setAnime(passedAnime);
        setError(null);
      } else {
        setError(err?.message || 'Failed to load anime details. The anime may not exist or the API is unavailable.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodes = async () => {
    setLoadingEpisodes(true);
    try {
      if (!anime) {
        console.warn('No anime data available');
        setEpisodes([]);
        setLoadingEpisodes(false);
        return;
      }

      console.log('🔍 Loading episodes for:', anime.title, 'animeId:', animeId);

      // First, try to use animeId directly if it looks like a streaming service ID
      // HiAnime IDs are URL-friendly slugs (not numeric IDs from metadata APIs)
      // Skip if animeId is purely numeric (likely from Jikan/MyAnimeList)
      const isNumericId = /^\d+$/.test(animeId);
      const looksLikeSlug = animeId && !isNumericId && (
        animeId.includes('watch/') || 
        animeId.includes('watch-') || 
        (animeId.match(/^[a-z0-9-]+$/i) && animeId.includes('-'))
      );

      if (looksLikeSlug) {
        console.log('📌 animeId looks like a streaming service slug, trying direct lookup...');
        // Try HiAnime first (most common format)
        try {
          const hianimeInfo = await getStreamingAnimeInfo(animeId, 'HiAnime');
          if (hianimeInfo && hianimeInfo.episodes.length > 0) {
            console.log(`✅ Direct lookup successful: ${hianimeInfo.episodes.length} episodes from HiAnime`);
            const formattedEpisodes: Episode[] = hianimeInfo.episodes.map((ep: Episode) => ({
              ...ep,
              source: 'HiAnime',
            }));
            setEpisodes(formattedEpisodes);
            setLoadingEpisodes(false);
            return;
          }
        } catch (err) {
          console.log('Direct HiAnime lookup failed, trying search...');
        }
      } else {
        console.log('📌 animeId is numeric or not a slug format, skipping direct lookup and using search...');
        
        // Try converting title to slug format and attempt direct lookup
        // This handles cases where we have "One Piece" and should try "one-piece" or "one-piece-100"
        if (anime.title) {
          const titleSlug = anime.title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
          
          if (titleSlug && titleSlug !== animeId && /^[a-z0-9-]+$/i.test(titleSlug) && titleSlug.includes('-')) {
            console.log(`📌 Trying direct lookup with slugified title: ${titleSlug}`);
            try {
              const hianimeInfo = await getStreamingAnimeInfo(titleSlug, 'HiAnime');
              if (hianimeInfo && hianimeInfo.episodes.length > 0) {
                console.log(`✅ Direct lookup with slug successful: ${hianimeInfo.episodes.length} episodes from HiAnime`);
                const formattedEpisodes: Episode[] = hianimeInfo.episodes.map((ep: Episode) => ({
                  ...ep,
                  source: 'HiAnime',
                }));
                setEpisodes(formattedEpisodes);
                setLoadingEpisodes(false);
                return;
              }
            } catch (err) {
              console.log('Direct lookup with slug failed, continuing with search...');
            }
          }
        }
      }

      const normalizeTitle = (title: string): string => {
        return title.toLowerCase()
          .replace(/[^\w\s]/g, '') // Remove special characters
          .replace(/\s+/g, ' ')     // Normalize whitespace
          .trim();
      };

      const stripSeasonMarkers = (title: string): string => {
        return title
          .replace(/\b(season|s)\s*\d+\b/gi, '')
          .replace(/\b(\d+)(st|nd|rd|th)\s*season\b/gi, '')
          .replace(/\bpart\s*\d+\b/gi, '')
          .replace(/\bcour\s*\d+\b/gi, '')
          .replace(/\bseason\s*two\b/gi, '')
          .replace(/\bseason\s*three\b/gi, '')
          .replace(/\bseason\s*four\b/gi, '')
          .replace(/\bii\b|\biii\b|\biv\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // Detect season indicators - improved to handle "second season", "2nd season", etc.
      const hasSeasonIndicator = /\b(season|s)\s*\d+\b|\b(\d+)(st|nd|rd|th)\s*season\b|\b(second|third|fourth|fifth)\s+season\b|\bpart\s*\d+\b|\bcour\s*\d+\b|\bii\b|\biii\b|\biv\b/i.test(anime.title);
      
      // Extract season number if present (for better matching)
      const seasonMatch = anime.title.match(/\b(season|s)\s*(\d+)\b|\b(\d+)(st|nd|rd|th)\s*season\b|\b(second|third|fourth|fifth)\s+season\b/i);
      const seasonNumber = seasonMatch 
        ? (seasonMatch[2] || seasonMatch[3] || (seasonMatch[5] === 'second' ? '2' : seasonMatch[5] === 'third' ? '3' : seasonMatch[5] === 'fourth' ? '4' : seasonMatch[5] === 'fifth' ? '5' : null))
        : null;

      // If direct lookup didn't work, search by title and find best match
      // Use searchTitle if available (might be better formatted for search)
      let searchQuery = searchTitle && searchTitle.trim() ? searchTitle.trim() : anime.title;
      console.log('🔍 Searching for streaming sources:', searchQuery);
      if (searchTitle && searchTitle !== anime.title) {
        console.log(`   Using searchTitle from params: "${searchTitle}" (anime title: "${anime.title}")`);
      }
      
      // Extract base title for better searching (remove "The second season of" etc.)
      // "The second season of *Sousou no Frieren*" -> "Sousou no Frieren" or "Frieren"
      // But only if we're not already using searchTitle
      if (!searchTitle || searchTitle === anime.title) {
        const seasonPrefixPattern = /^(the\s+)?(second|third|fourth|fifth|2nd|3rd|4th|5th)\s+season\s+of\s+/i;
        if (seasonPrefixPattern.test(anime.title)) {
          const baseTitle = anime.title.replace(seasonPrefixPattern, '').replace(/^\*|\*$/g, '').trim();
          if (baseTitle) {
            searchQuery = baseTitle;
            console.log('🔍 Extracted base title for search:', searchQuery);
          }
        }
      }
      
      // Remove common prefixes like "The second season of", "The third season of", etc.
      const seasonPrefixPattern = /^(the\s+)?(second|third|fourth|fifth|2nd|3rd|4th|5th)\s+season\s+of\s+/i;
      if (seasonPrefixPattern.test(anime.title)) {
        const baseTitle = anime.title.replace(seasonPrefixPattern, '').replace(/^\*|\*$/g, '').trim();
        if (baseTitle) {
          searchQuery = baseTitle;
          console.log('🔍 Extracted base title for search:', searchQuery);
        }
      }
      
      // Also try searching with a slugified version of the title (e.g., "One Piece" -> "one-piece")
      // This can help find matches when the title format differs
      const titleSlug = searchQuery
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      let searchResults = await searchStreamingAnime(searchQuery);
      
      // If no results with base title, try slug format
      if (searchResults.length === 0 && titleSlug && titleSlug !== searchQuery.toLowerCase()) {
        console.log('🔍 No results with base title, trying slug format:', titleSlug);
        searchResults = await searchStreamingAnime(titleSlug);
      }
      
      // If still no results, try original title
      if (searchResults.length === 0 && searchQuery !== anime.title) {
        console.log('🔍 No results with base title, trying original title:', anime.title);
        searchResults = await searchStreamingAnime(anime.title);
      }

      if (searchResults.length === 0) {
        const baseTitle = stripSeasonMarkers(anime.title);
        if (baseTitle && baseTitle.toLowerCase() !== anime.title.toLowerCase()) {
          console.log('🔍 No results for full title. Retrying with base title:', baseTitle);
          searchResults = await searchStreamingAnime(baseTitle);
        }
      }

      // If still no results, try searching with just the first few words of the title
      if (searchResults.length === 0) {
        const titleWords = anime.title.split(' ').filter(w => w.length > 2);
        if (titleWords.length > 3) {
          const shortTitle = titleWords.slice(0, 3).join(' ');
          console.log('🔍 No results. Retrying with shortened title:', shortTitle);
          searchResults = await searchStreamingAnime(shortTitle);
        }
      }

      if (searchResults.length === 0) {
        console.warn('❌ No streaming sources found for:', anime.title);
        console.warn('   Tried searches with:', [
          anime.title,
          stripSeasonMarkers(anime.title),
          anime.title.split(' ').filter(w => w.length > 2).slice(0, 3).join(' ')
        ].filter(Boolean));
        setEpisodes([]);
        setLoadingEpisodes(false);
        return;
      }

      console.log(`📊 Found ${searchResults.length} search results for "${anime.title}":`);
      // Log all search results for debugging
      searchResults.slice(0, 10).forEach((r, i) => {
        console.log(`   ${i + 1}. "${r.title}" (ID: ${r.id})`);
      });

      // Find the best match by comparing titles more carefully
      const normalizedAnimeTitle = normalizeTitle(stripSeasonMarkers(anime.title));
      let bestMatch: typeof searchResults[0] | null = null;
      let bestScore = 0;
      let foundSeasonMatch = false;

      for (const result of searchResults) {
        const normalizedResultTitle = normalizeTitle(result.title);
        
        // Check if result has matching season number
        const resultSeasonMatch = result.title.match(/\b(season|s)\s*(\d+)\b|\b(\d+)(st|nd|rd|th)\s*season\b|\b(second|third|fourth|fifth)\s+season\b/i);
        const resultSeasonNumber = resultSeasonMatch 
          ? (resultSeasonMatch[2] || resultSeasonMatch[3] || (resultSeasonMatch[5] === 'second' ? '2' : resultSeasonMatch[5] === 'third' ? '3' : resultSeasonMatch[5] === 'fourth' ? '4' : resultSeasonMatch[5] === 'fifth' ? '5' : null))
          : null;
        
        // If we have a specific season number we're looking for
        if (seasonNumber) {
          if (resultSeasonNumber) {
            if (seasonNumber === resultSeasonNumber) {
              // Exact season match - give very high score
              const normalizedResultTitleStripped = normalizeTitle(stripSeasonMarkers(result.title));
              const baseScore = normalizedResultTitleStripped === normalizedAnimeTitle ? 100 : 80;
              if (baseScore > bestScore) {
                bestMatch = result;
                bestScore = baseScore;
                foundSeasonMatch = true;
                console.log(`   📌 Found season ${seasonNumber} match: "${result.title}" (score: ${baseScore})`);
              }
              continue; // Don't break, keep checking for better matches
            } else {
              // Different season - skip this result
              console.log(`   ⏭️ Skipping wrong season: "${result.title}" (has season ${resultSeasonNumber}, need ${seasonNumber})`);
              continue;
            }
          } else {
            // Result has no season indicator but we need a specific season
            // This is likely Season 1 - skip it when looking for Season 2+
            console.log(`   ⏭️ Skipping result without season indicator: "${result.title}" (need season ${seasonNumber})`);
            continue;
          }
        }

        // Exact match gets highest score (only when not looking for specific season)
        if (normalizedResultTitle === normalizedAnimeTitle) {
          bestMatch = result;
          bestScore = 100;
          if (hasSeasonIndicator) {
            foundSeasonMatch = /\b(season|s)\s*\d+\b|\b(\d+)(st|nd|rd|th)\s*season\b|\b(second|third|fourth|fifth)\s+season\b|\bpart\s*\d+\b|\bcour\s*\d+\b|\bii\b|\biii\b|\biv\b/i.test(result.title);
          }
          break;
        }
        
        // Calculate similarity score - improved algorithm
        const words = normalizedAnimeTitle.split(' ').filter(w => w.length > 2);
        const resultWords = normalizedResultTitle.split(' ').filter(w => w.length > 2);
        
        // Count matching words (case-insensitive)
        const matchingWords = words.filter(word => 
          resultWords.some(rw => rw === word || rw.includes(word) || word.includes(rw))
        ).length;
        
        // Also check if result title contains significant words from anime title
        const significantMatches = words.filter(word => 
          word.length > 3 && normalizedResultTitle.includes(word)
        ).length;
        
        // Use the better of the two matching methods
        const wordMatchScore = words.length > 0 ? (matchingWords / words.length) * 100 : 0;
        const significantMatchScore = words.length > 0 ? (significantMatches / words.length) * 100 : 0;
        const score = Math.max(wordMatchScore, significantMatchScore);
        
        // Bonus points for matching key words
        const keyWords = ['season', 'part', 'the', 'culling', 'game'];
        const matchingKeyWords = keyWords.filter(word => 
          normalizedAnimeTitle.includes(word) && normalizedResultTitle.includes(word)
        ).length;
        const bonusScore = matchingKeyWords * 10;
        let totalScore = score + bonusScore;

        if (hasSeasonIndicator) {
          const resultHasSeason = /\b(season|s)\s*\d+\b|\b(\d+)(st|nd|rd|th)\s*season\b|\b(second|third|fourth|fifth)\s+season\b|\bpart\s*\d+\b|\bcour\s*\d+\b|\bii\b|\biii\b|\biv\b/i.test(result.title);
          if (resultHasSeason) {
            foundSeasonMatch = true;
            // If we have specific season numbers, check if they match
            if (seasonNumber && resultSeasonNumber) {
              if (seasonNumber === resultSeasonNumber) {
                totalScore += 30; // Big bonus for exact season match
              } else {
                totalScore -= 50; // Big penalty for wrong season
              }
            } else {
              totalScore += 15; // General bonus for having season indicator
            }
          } else {
            totalScore -= 10;
          }
        }
        
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMatch = result;
        }
      }

      // If no match found, use first result as fallback but with low score
      if (!bestMatch && searchResults.length > 0) {
        bestMatch = searchResults[0];
        console.warn(`⚠️ No good match found, falling back to first result: "${bestMatch.title}"`);
      }

      if (!bestMatch) {
        console.warn('❌ No matches found at all');
        setEpisodes([]);
        setLoadingEpisodes(false);
        return;
      }

      console.log(`✅ Best match (${bestScore.toFixed(0)}% similarity):`, bestMatch.source, 'Title:', bestMatch.title, 'ID:', bestMatch.id);
      console.log(`   Original title: "${anime.title}"`);
      console.log(`   Match title: "${bestMatch.title}"`);

      // Check if we were looking for a specific season but couldn't find it
      if (seasonNumber && bestScore === 0) {
        console.warn(`⚠️ Could not find Season ${seasonNumber} in search results. Available results:`);
        searchResults.slice(0, 5).forEach((r, i) => console.warn(`   ${i + 1}. ${r.title}`));
        setEpisodes([]);
        setLoadingEpisodes(false);
        return;
      }

      // Additional check: ensure best match has season indicator when looking for specific season
      if (seasonNumber && foundSeasonMatch) {
        const bestMatchHasSeason = /\b(season|s)\s*\d+\b|\b(\d+)(st|nd|rd|th)\s*season\b|\bpart\s*\d+\b|\bcour\s*\d+\b|\bii\b|\biii\b|\biv\b/i.test(bestMatch.title);
        if (!bestMatchHasSeason) {
          console.warn('⚠️ Found season-specific results, but best match lacks season indicator. Skipping to avoid wrong episodes.');
          setEpisodes([]);
          setLoadingEpisodes(false);
          return;
        }
      }
      
      // Validate match quality - require at least 30% similarity (lowered from 50% to be more lenient)
      // If we only have one result, be more lenient (accept 20% similarity)
      const minSimilarity = searchResults.length === 1 ? 20 : 30;
      if (bestScore < minSimilarity) {
        console.warn(`⚠️ Best match similarity (${bestScore.toFixed(0)}%) is too low (minimum: ${minSimilarity}%). Skipping to avoid wrong episodes.`);
        console.warn(`   Looking for: "${anime.title}"`);
        console.warn(`   Best match: "${bestMatch.title}"`);
        console.warn(`   Total search results: ${searchResults.length}`);
        setEpisodes([]);
        setLoadingEpisodes(false);
        return;
      }

      // Fetch episodes using the best match ID
      // Use the ID directly from search results (it's already in the correct format like "one-piece-100")
      const animeIdToUse = bestMatch.id;
      console.log(`🔍 Fetching episodes for ID: ${animeIdToUse} (from search result)`);
      console.log(`   Search result title: "${bestMatch.title}"`);
      console.log(`   Search result source: ${bestMatch.source}`);
      console.log(`   Search result URL: "${bestMatch.url || 'N/A'}"`);
      
      // Try to extract full ID from URL if available (with numeric suffix)
      let finalAnimeId = animeIdToUse;
      if (bestMatch.url && bestMatch.url.includes('/watch/')) {
        const urlMatch = bestMatch.url.match(/\/watch\/([^/?]+)/);
        if (urlMatch && urlMatch[1]) {
          const urlId = urlMatch[1];
          // Use URL ID if it's longer (has numeric suffix) or has numeric suffix and current ID doesn't
          if ((urlId.length > animeIdToUse.length && urlId.startsWith(animeIdToUse)) || 
              (urlId.match(/-\d{3,}$/) && !animeIdToUse.match(/-\d{3,}$/))) {
            finalAnimeId = urlId;
            console.log(`📌 Using full ID from URL: ${finalAnimeId} (was: ${animeIdToUse})`);
          }
        }
      }
      
      const streamingInfo = await getStreamingAnimeInfo(finalAnimeId, bestMatch.source);
      
      // Validate that we got episodes for the correct anime
      // Simplified validation - be more lenient since we already matched the anime via search
      if (streamingInfo && streamingInfo.episodes.length > 0) {
        console.log(`✅ Loaded ${streamingInfo.episodes.length} episodes from ${bestMatch.source}`);
        console.log(`   Using anime ID: ${animeIdToUse}`);
        console.log(`   First episode: ${streamingInfo.episodes[0]?.title || streamingInfo.episodes[0]?.id || 'N/A'}`);
        
        // Format episodes for the app
        // Since we already matched via search, trust the episodes are correct
        const formattedEpisodes: Episode[] = streamingInfo.episodes.map((ep: Episode) => ({
          ...ep,
          source: bestMatch.source,
        }));
        
        setEpisodes(formattedEpisodes);
      } else {
        console.warn(`❌ No episodes found on ${bestMatch.source} for ID: ${finalAnimeId}`);
        console.warn(`   Original ID from search: ${animeIdToUse}`);
        console.warn(`   Search result URL: ${bestMatch.url || 'N/A'}`);
        
        // Fallback: try other search results
        if (searchResults.length > 1) {
          console.log(`🔄 Trying other search results (${searchResults.length} total)...`);
          for (let i = 0; i < Math.min(3, searchResults.length); i++) {
            if (searchResults[i].id === bestMatch.id) continue;
            
            const fallbackId = searchResults[i].id;
            console.log(`   Trying result ${i + 1}: ${fallbackId} - "${searchResults[i].title}"`);
            
            try {
              // Extract full ID from URL if available
              let fallbackFinalId = fallbackId;
              const fallbackUrl = searchResults[i].url;
              if (fallbackUrl && fallbackUrl.includes('/watch/')) {
                const urlMatch = fallbackUrl.match(/\/watch\/([^/?]+)/);
                if (urlMatch && urlMatch[1]) {
                  fallbackFinalId = urlMatch[1];
                }
              }
              
              const fallbackInfo = await getStreamingAnimeInfo(fallbackFinalId, searchResults[i].source);
              if (fallbackInfo && fallbackInfo.episodes.length > 0) {
                console.log(`✅ Fallback successful with result ${i + 1}: ${fallbackInfo.episodes.length} episodes`);
                const formattedEpisodes: Episode[] = fallbackInfo.episodes.map((ep: Episode) => ({
                  ...ep,
                  source: searchResults[i].source,
                }));
                setEpisodes(formattedEpisodes);
                setLoadingEpisodes(false);
                return;
              }
            } catch (fallbackErr: any) {
              console.warn(`   Fallback ${i + 1} failed:`, fallbackErr?.message || fallbackErr);
            }
          }
        }
        
        console.error(`❌ All episode fetch attempts failed for: "${anime.title}"`);
        console.error(`   Tried ID: ${finalAnimeId}`);
        console.error(`   Search found ${searchResults.length} results`);
        setEpisodes([]);
      }
    } catch (err) {
      console.error('❌ Error loading episodes:', err);
      setEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading anime details...</Text>
        </View>
      </View>
    );
  }

  if (error || (!anime && !loading)) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={80} color="#E50914" />
          <Text style={styles.errorText}>{error || 'Anime not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAnimeDetails}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButtonBottom} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!anime) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading anime details...</Text>
        </View>
      </View>
    );
  }

  const handlePlayPress = () => {
    const firstEpisode = episodes[0];
    if (firstEpisode) {
      console.log('▶️ Playing episode:', {
        episodeId: firstEpisode.id,
        episodeNumber: firstEpisode.episodeNumber,
        episodeUrl: firstEpisode.videoUrl,
        source: firstEpisode.source
      });
      navigation.navigate('VideoPlayer', { 
        animeId: anime.id, 
        episodeId: firstEpisode.id,
        animeTitle: anime.title,
        episodeNumber: firstEpisode.episodeNumber,
        episodeUrl: firstEpisode.videoUrl,
        source: firstEpisode.source || 'Unknown'
      });
    } else {
      console.warn('No episodes available');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: anime.bannerImage }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', '#000']}
            style={styles.gradient}
          />
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{anime.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={18} color="#FFD700" />
              <Text style={styles.rating}>{anime.rating}</Text>
            </View>
            <Text style={styles.meta}>{anime.year}</Text>
            <Text style={styles.meta}>{anime.status}</Text>
            <Text style={styles.meta}>{anime.episodes} Episodes</Text>
          </View>

          <TouchableOpacity style={styles.playButton} onPress={handlePlayPress}>
            <MaterialIcons name="play-arrow" size={28} color="#000" />
            <Text style={styles.playButtonText}>Play Episode 1</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.actionText}>My List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="thumb-up" size={24} color="#fff" />
              <Text style={styles.actionText}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="share" size={24} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>{anime.description}</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Studio:</Text>
              <Text style={styles.infoValue}>{anime.studio}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Genres:</Text>
              <Text style={styles.infoValue}>{anime.genres.join(', ')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{anime.duration} per episode</Text>
            </View>
          </View>

          <View style={styles.episodesSection}>
            <Text style={styles.sectionTitle}>Episodes</Text>
            {loadingEpisodes ? (
              <View style={styles.episodesLoading}>
                <ActivityIndicator size="small" color="#E50914" />
                <Text style={styles.episodesLoadingText}>Loading episodes...</Text>
              </View>
            ) : episodes.length > 0 ? (
              episodes.slice(0, 20).map((episode, index) => (
                <TouchableOpacity
                  key={`${episode.id}-${episode.episodeNumber}-${index}`}
                  style={styles.episodeItem}
                  onPress={() => {
                    console.log('▶️ Playing episode:', {
                      episodeId: episode.id,
                      episodeNumber: episode.episodeNumber,
                      episodeUrl: episode.videoUrl,
                      source: episode.source
                    });
                    navigation.navigate('VideoPlayer', {
                      animeId: anime.id,
                      episodeId: episode.id,
                      animeTitle: anime.title,
                      episodeNumber: episode.episodeNumber,
                      episodeUrl: episode.videoUrl,
                      source: episode.source || 'Unknown'
                    });
                  }}
                >
                  <Image
                    source={{ uri: episode.thumbnail || anime.coverImage }}
                    style={styles.episodeThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.episodeInfo}>
                    <Text style={styles.episodeTitle}>{episode.title || `Episode ${episode.episodeNumber}`}</Text>
                    <Text style={styles.episodeDuration}>{episode.duration || anime.duration}</Text>
                  </View>
                  <MaterialIcons name="play-circle-outline" size={32} color="#fff" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noEpisodesText}>No episodes available</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bannerContainer: {
    width: width,
    height: 400,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rating: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  meta: {
    color: '#aaa',
    fontSize: 14,
    marginRight: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 6,
    marginBottom: 20,
  },
  playButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 6,
  },
  description: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#aaa',
    fontSize: 14,
    width: 80,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  episodesSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
  },
  episodeThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 6,
  },
  episodeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeDuration: {
    color: '#aaa',
    fontSize: 13,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 24,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButtonBottom: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  episodesLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  episodesLoadingText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
  },
  noEpisodesText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default AnimeDetailScreen;

