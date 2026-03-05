import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  detailsWrapper: {
    ...Platform.select({ web: { minHeight: 400 }, default: {} }),
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  errorText: { color: '#e50914', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#e50914', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  headerWeb: { paddingHorizontal: 32, borderBottomWidth: 1, borderBottomColor: '#222' },
  backButton: { padding: 4 },
  headerTitleContainer: { flex: 1, gap: 2 },
  headerAnimeName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  episodeTitle: { color: '#aaa', fontSize: 13 },

  // Player
  playerContainer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  playerContainerWeb: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden' },
  videoLoadingContainer: {
    width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  videoLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  loadingStatusText: { color: '#aaa', marginTop: 12, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  timeoutContainer: {
    width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  timeoutText: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  timeoutSubtext: { color: '#888', fontSize: 14, marginTop: 8, textAlign: 'center' },
  retryServerButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e50914', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20,
  },
  retryServerButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  noSourceContainer: {
    width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  noSourceText: { color: '#888', fontSize: 16, marginTop: 12, textAlign: 'center' },

  // Info section
  infoSection: { padding: 16, paddingHorizontal: Platform.OS === 'web' ? 32 : 16 },
  infoSectionWeb: { paddingHorizontal: 0 },
  infoLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  infoText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  streamType: { color: '#666', fontSize: 12, marginTop: 4 },
  retryingText: { color: '#e50914', fontSize: 12, marginTop: 4 },

  // Anime info card
  animeInfoCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
    gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  animeInfoCardWeb: { paddingHorizontal: 0 },
  animeInfoPoster: { width: 72, height: 100, borderRadius: 6, backgroundColor: '#1a1a1a', flexShrink: 0 },
  animeInfoDetails: { flex: 1, gap: 4, paddingTop: 2 },
  animeInfoName: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  animeInfoEpisode: { color: '#e50914', fontSize: 13, fontWeight: '600' },
  animeInfoGenres: { color: '#888', fontSize: 12, marginTop: 2 },
  animeInfoEpCount: { color: '#555', fontSize: 11, marginTop: 4 },

  // Community section
  communitySection: {
    padding: 16, paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
  },
  communitySectionWeb: { paddingHorizontal: 0, borderTopWidth: 0 },
  communityHeader: { marginBottom: 16 },
  communityTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  communityActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  communityActionsWeb: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
  clipButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#e50914', borderRadius: 8,
  },
  clipButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  postButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#222', borderRadius: 8, borderWidth: 1, borderColor: '#333',
  },
  postButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  commentButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#222', borderRadius: 8, borderWidth: 1, borderColor: '#333',
  },
  commentButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  loadingIndicator: { marginVertical: 20 },
  noPostsText: { color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  // Web layout
  webLayout: { flex: 1, flexDirection: 'row' as const, gap: 16, padding: 16 },
  webMainSection: { flex: 3, minWidth: 0 },
  webSidebarSection: {
    flex: 1, minWidth: 280, maxWidth: 400,
    backgroundColor: '#0a0a0a', borderRadius: 12, borderWidth: 1, borderColor: '#1a1a1a', maxHeight: '100%',
  },

  // Create Post modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
    }),
  },
  modalContent: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  clipInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#222', padding: 12, borderRadius: 8, marginBottom: 12, minHeight: 44,
  },
  clipInfoHidden: { height: 0, minHeight: 0, padding: 0, marginBottom: 0, opacity: 0 },
  clipInfoText: { color: '#e50914', fontSize: 14, fontWeight: '500' },
  postInput: {
    backgroundColor: '#222', borderRadius: 8, padding: 12, color: '#fff',
    fontSize: 14, minHeight: 100, marginBottom: 16, borderWidth: 1, borderColor: '#333',
  },
  submitButton: { backgroundColor: '#e50914', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#333', opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
