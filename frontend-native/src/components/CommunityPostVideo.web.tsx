import { View, StyleSheet, type ViewStyle } from 'react-native';

interface CommunityPostVideoProps {
  url: string;
  style?: ViewStyle;
}

export function CommunityPostVideo({ url, style }: CommunityPostVideoProps) {
  return (
    <View style={[styles.container, style]}>
      <video
        src={url}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
        controls
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
  },
});
