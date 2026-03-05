import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CommentInputRowProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
}

export function CommentInputRow({ value, onChangeText, onSubmit, submitting, disabled }: CommentInputRowProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Add a comment..."
        placeholderTextColor="#666"
        value={value}
        onChangeText={onChangeText}
        maxLength={280}
        multiline
        numberOfLines={1}
        returnKeyType="default"
        blurOnSubmit={false}
        textAlignVertical="center"
        editable={!submitting}
      />
      <TouchableOpacity
        style={[styles.sendButton, (disabled || submitting) && styles.sendButtonDisabled]}
        onPress={onSubmit}
        disabled={disabled || submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="send" size={18} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
});
