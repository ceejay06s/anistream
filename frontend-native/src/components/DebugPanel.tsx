import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDebugError, useDebug, type DebugErrorEntry } from '@/context/DebugContext';
import { copyToClipboard } from '@/utils/copyToClipboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(360, SCREEN_WIDTH * 0.9);
const FAB_SIZE = 44;
const EDGE_INSET = 8;

interface Props {
  errors: DebugErrorEntry[];
  onClear: () => void;
  visible: boolean;
  onToggle: () => void;
}

export class DebugErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    addDebugError(
      {
        message: error.message,
        stack: error.stack ?? info.componentStack ?? undefined,
      },
      'boundary'
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={boundaryStyles.fallback}>
          <Text style={boundaryStyles.text}>Something went wrong. Check the debug panel.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function copyEntryToClipboard(entry: DebugErrorEntry) {
  const text = [entry.message, entry.stack].filter(Boolean).join('\n\n');
  copyToClipboard(text);
}

export function DebugPanelUI({ errors, onClear, visible, onToggle }: Props) {
  const showFab = errors.length > 0;
  return (
    <>
      {showFab && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggle}
          style={styles.fab}
          accessibilityLabel="Open debug panel"
        >
          <Ionicons name="bug" size={24} color="#fff" />
          {errors.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{errors.length > 99 ? '99+' : errors.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onToggle}
      >
        <Pressable style={styles.modalBackdrop} onPress={onToggle}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.panelInner}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Debug</Text>
                <View style={styles.panelActions}>
                  {errors.length > 0 && (
                    <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
                      <Ionicons name="trash-outline" size={20} color="#fff" />
                      <Text style={styles.clearBtnText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onToggle} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
                nestedScrollEnabled={true}
              >
              {errors.length === 0 ? (
                <Text style={styles.empty}>No errors captured.</Text>
              ) : (
                errors.map((entry) => (
                  <View key={entry.id} style={styles.entry}>
                    <View style={styles.entryHeader}>
                      <View style={[styles.sourceChip, entry.source === 'promise' && styles.sourceChipPromise, entry.source === 'console' && styles.sourceChipConsole]}>
                        <Text style={styles.sourceChipText}>{entry.source}</Text>
                      </View>
                      <View style={styles.entryHeaderRight}>
                        <TouchableOpacity
                          onPress={() => copyEntryToClipboard(entry)}
                          style={styles.copyBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="copy-outline" size={18} color="#fff" />
                          <Text style={styles.copyBtnText}>Copy</Text>
                        </TouchableOpacity>
                        <Text style={styles.entryTime}>
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.entryMessage} selectable>
                      {entry.message}
                    </Text>
                    {entry.stack && (
                      <Text style={styles.entryStack} selectable numberOfLines={20}>
                        {entry.stack}
                      </Text>
                    )}
                  </View>
                ))
              )}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const boundaryStyles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 24,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: EDGE_INSET,
    top: Platform.OS === 'web' ? 80 : 56,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 8 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
    }),
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  panel: {
    width: PANEL_WIDTH,
    height: '85%',
    maxHeight: 700,
    backgroundColor: '#111',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8 },
      android: { elevation: 16 },
      web: { boxShadow: '-4px 0 24px rgba(0,0,0,0.5)' },
    }),
  },
  panelInner: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  panelTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  clearBtnText: {
    color: '#fff',
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  empty: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  entry: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e50914',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  entryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  sourceChip: {
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceChipPromise: {
    backgroundColor: '#7c2d12',
  },
  sourceChipConsole: {
    backgroundColor: '#854d0e',
  },
  sourceChipText: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  entryTime: {
    color: '#666',
    fontSize: 11,
  },
  entryMessage: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 6,
  },
  entryStack: {
    color: '#888',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'monospace',
  },
});

/** Renders the floating debug button + panel. Use inside DebugProvider. */
export function DebugPanelWithButton() {
  const { errors, clearErrors } = useDebug();
  const [visible, setVisible] = useState(false);
  return (
    <DebugPanelUI
      errors={errors}
      onClear={clearErrors}
      visible={visible}
      onToggle={() => setVisible((v) => !v)}
    />
  );
}
