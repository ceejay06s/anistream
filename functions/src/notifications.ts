import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendPushNotification } from './pushNotifications';

const db = admin.firestore();

/**
 * Triggered when a new post is created
 * Notifies users who have the anime in their saved list
 */
export const onPostCreated = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    const postId = context.params.postId;

    // Skip if post doesn't have an animeId
    if (!post.animeId || post.animeId === null) {
      console.log('Post has no animeId, skipping notifications');
      return null;
    }

    try {
      // Find all users who have this anime saved
      const savedAnimeSnapshot = await db
        .collectionGroup('savedAnime')
        .where('id', '==', post.animeId)
        .get();

      const notifications: Promise<any>[] = [];

      savedAnimeSnapshot.docs.forEach((doc) => {
        // Extract userId from path: users/{userId}/savedAnime/{animeId}
        const pathParts = doc.ref.path.split('/');
        const userIdIndex = pathParts.indexOf('users');
        const userId = userIdIndex >= 0 && userIdIndex < pathParts.length - 1
          ? pathParts[userIdIndex + 1]
          : null;

        // Don't notify the post author
        if (userId && userId !== post.userId) {
          notifications.push(
            db.collection('notifications').add({
              userId,
              type: 'post_anime_interest',
              title: `New post about ${post.animeName || 'an anime'}`,
              body: `${post.userName || 'Someone'} posted about ${post.animeName || 'an anime'}`,
              data: {
                animeId: post.animeId,
                postId,
                actorId: post.userId,
                actorName: post.userName || 'Anonymous',
                actorPhoto: post.userPhoto || null,
              },
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })
          );
        }
      });

      await Promise.all(notifications);
      console.log(`Created ${notifications.length} notifications for post ${postId}`);
      return null;
    } catch (error) {
      console.error('Error creating post notifications:', error);
      return null;
    }
  });

/**
 * Triggered when a new comment is created
 * Notifies the post author and users who commented on the same post
 */
export const onCommentCreated = functions.firestore
  .document('posts/{postId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const comment = snap.data();
    const { postId, commentId } = context.params;

    try {
      // Get the post
      const postRef = db.doc(`posts/${postId}`);
      const postSnap = await postRef.get();

      if (!postSnap.exists) {
        console.log('Post not found, skipping notifications');
        return null;
      }

      const post = postSnap.data()!;
      const notifications: Promise<any>[] = [];
      const notifiedUserIds = new Set<string>();

      // Notify post author (if not the comment author)
      if (post.userId !== comment.userId) {
        notifiedUserIds.add(post.userId);
        notifications.push(
          db.collection('notifications').add({
            userId: post.userId,
            type: 'comment_on_post',
            title: 'New comment on your post',
            body: `${comment.userName || 'Someone'} commented on your post`,
            data: {
              postId,
              commentId,
              actorId: comment.userId,
              actorName: comment.userName || 'Anonymous',
              actorPhoto: comment.userPhoto || null,
            },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        );
      }

      // Get all comments on this post
      const commentsSnapshot = await db
        .collection(`posts/${postId}/comments`)
        .get();

      // Notify users who commented (excluding post author and comment author)
      commentsSnapshot.docs.forEach((commentDoc) => {
        const otherComment = commentDoc.data();
        const otherCommentUserId = otherComment.userId;

        if (
          otherCommentUserId !== comment.userId &&
          otherCommentUserId !== post.userId &&
          !notifiedUserIds.has(otherCommentUserId)
        ) {
          notifiedUserIds.add(otherCommentUserId);
          notifications.push(
            db.collection('notifications').add({
              userId: otherCommentUserId,
              type: 'comment_on_commented_post',
              title: 'New comment on post you commented on',
              body: `${comment.userName || 'Someone'} also commented`,
              data: {
                postId,
                commentId,
                actorId: comment.userId,
                actorName: comment.userName || 'Anonymous',
                actorPhoto: comment.userPhoto || null,
              },
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })
          );
        }
      });

      await Promise.all(notifications);
      console.log(`Created ${notifications.length} notifications for comment ${commentId}`);
      return null;
    } catch (error) {
      console.error('Error creating comment notifications:', error);
      return null;
    }
  });
