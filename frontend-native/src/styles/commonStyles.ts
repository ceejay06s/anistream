import { StyleSheet } from 'react-native';

/** Shared style primitives reused across screens */
export const commonStyles = StyleSheet.create({
  // Layout
  flex1: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },

  // Backgrounds
  bgBlack: { backgroundColor: '#000' },
  bgCard: { backgroundColor: '#111' },
  bgDeep: { backgroundColor: '#0a0a0a' },

  // Text
  textWhite: { color: '#fff' },
  textMuted: { color: '#888' },
  textDim: { color: '#666' },
  textRed: { color: '#e50914' },

  // Buttons
  btnRed: {
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDark: {
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  btnText: { color: '#fff', fontWeight: '600' },

  // Dividers / borders
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#222' },
  borderTop: { borderTopWidth: 1, borderTopColor: '#222' },
});
