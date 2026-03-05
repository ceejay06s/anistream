import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '@/utils/formatTime';

interface ResumeWatchingPromptProps {
  visible: boolean;
  timestamp: number;
  isDesktopWeb?: boolean;
  onResume: () => void;
  onRestart: () => void;
}

export function ResumeWatchingPrompt({
  visible,
  timestamp,
  isDesktopWeb = false,
  onResume,
  onRestart,
}: ResumeWatchingPromptProps) {
  if (!visible) return null;

  return (
    <View style={[styles.container, isDesktopWeb && styles.containerWeb]}>
      <View style={styles.content}>
        <Ionicons name="play-circle-outline" size={24} color="#e50914" />
        <Text style={styles.text}>Resume from {formatTime(timestamp)}?</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.resumeButton} onPress={onResume}>
          <Text style={styles.resumeButtonText}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
          <Text style={styles.restartButtonText}>Start Over</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  containerWeb: {
    paddingHorizontal: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  resumeButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  restartButton: {
    backgroundColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  restartButtonText: {
    color: '#ccc',
    fontSize: 13,
  },
});
