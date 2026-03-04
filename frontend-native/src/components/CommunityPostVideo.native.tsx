import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface CommunityPostVideoProps {
  url: string;
  style?: ViewStyle;
}

export function CommunityPostVideo({ url, style }: CommunityPostVideoProps) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 160,
  },
  video: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});
