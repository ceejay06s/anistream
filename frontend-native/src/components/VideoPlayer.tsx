// This file re-exports the platform-specific VideoPlayer component
// React Native's Metro bundler will automatically pick:
// - VideoPlayer.native.tsx for iOS/Android
// - VideoPlayer.web.tsx for Web

export { VideoPlayer, type VideoPlayerProps } from './VideoPlayer.native';
