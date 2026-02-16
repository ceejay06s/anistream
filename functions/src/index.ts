import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Export all functions
export { onPostCreated } from './notifications';
export { onCommentCreated } from './notifications';
export { checkAnimeUpdates } from './animeUpdates';
export { onNotificationCreated } from './pushNotifications';
