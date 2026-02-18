import { Platform } from 'react-native';
import { app } from '@/config/firebase';
import { userNotificationService } from './userNotificationService';

// Lazy initialization to avoid module load order issues
function getDb() {
  if (!app) {
    return null;
  }
  const { getFirestore } = require('firebase/firestore');
  return getFirestore(app);
}

function getStorage() {
  if (!app) {
    return null;
  }
  const { getStorage } = require('firebase/storage');
  return getStorage(app);
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

async function uploadMediaFile(
  file: File,
  userId: string
): Promise<MediaItem> {
  // Use backend proxy to avoid CORS issues (no Blaze plan needed)
  const { API_BASE_URL } = require('./api');
  const axios = require('axios');

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('folder', 'posts');

    const response = await axios.post(`${API_BASE_URL}/api/upload/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      return {
        url: response.data.url,
        type: response.data.type,
      };
    } else {
      throw new Error(response.data.error || 'Upload failed');
    }
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || 'Invalid file or request');
    } else if (error.response?.status === 413) {
      throw new Error('File size exceeds 10MB limit');
    } else if (error.response?.status === 401) {
      throw new Error('You must be authenticated to upload files');
    } else if (error.message?.includes('CORS') || error.message?.includes('cors')) {
      throw new Error('Upload failed due to network error. Please try again.');
    } else {
      throw new Error(`Upload failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  }
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  animeId?: string;
  animeName?: string;
  media?: MediaItem[];
  likes: string[];
  commentCount: number;
  createdAt: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  createdAt: number;
}

export interface UserInfo {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

export const communityService = {
  async getPosts(limitCount: number = 20): Promise<Post[]> {
    const db = getDb();
    if (!db) {
      return this.getMockPosts();
    }

    try {
      const { collection, query, orderBy, limit, getDocs } = require('firebase/firestore');
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return this.getMockPosts();
      }

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        likes: [],
        commentCount: 0,
        ...doc.data(),
      }));
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      return this.getMockPosts();
    }
  },

  async getPostsByAnime(animeId: string, limitCount: number = 50): Promise<Post[]> {
    const db = getDb();
    if (!db) {
      // Return mock posts filtered by anime ID
      return this.getMockPosts().filter(p => p.animeId === animeId);
    }

    try {
      const { collection, query, orderBy, where, limit, getDocs } = require('firebase/firestore');
      const q = query(
        collection(db, 'posts'),
        where('animeId', '==', animeId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        likes: [],
        commentCount: 0,
        ...doc.data(),
      }));
    } catch (err) {
      console.error('Failed to fetch posts by anime:', err);
      return [];
    }
  },

  async createPost(
    user: UserInfo,
    content: string,
    animeId?: string,
    animeName?: string,
    mediaFiles?: File[]
  ): Promise<Post> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    // Upload media files if provided
    let media: MediaItem[] | undefined;
    if (mediaFiles && mediaFiles.length > 0) {
      media = await Promise.all(
        mediaFiles.map((file) => uploadMediaFile(file, user.uid))
      );
    }

    const { collection, addDoc } = require('firebase/firestore');
    const postData = {
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userPhoto: user.photoURL || null,
      content,
      animeId: animeId || null,
      animeName: animeName || null,
      media: media || null,
      likes: [],
      commentCount: 0,
      createdAt: Date.now(),
    };

    const docRef = await addDoc(collection(db, 'posts'), postData);
    const newPost = {
      id: docRef.id,
      ...postData,
    };

    // Trigger notifications for users interested in this anime
    if (animeId) {
      try {
        await this.notifyAnimeInterestUsers(animeId, animeName || '', newPost.id, user);
      } catch (err) {
        console.error('Failed to send anime interest notifications:', err);
        // Don't fail the post creation if notifications fail
      }
    }

    return newPost;
  },

  /**
   * Notify users who are interested in an anime about a new post
   * Note: This uses collectionGroup which requires an index in Firestore
   * In production, this should be done via Cloud Functions for better performance
   */
  async notifyAnimeInterestUsers(
    animeId: string,
    animeName: string,
    postId: string,
    postAuthor: UserInfo
  ): Promise<void> {
    const db = getDb();
    if (!db) {
      return;
    }

    try {
      // Use collectionGroup to find all users who have this anime saved
      // This requires a Firestore index: Collection Group 'savedAnime' with fields: id
      const { collectionGroup, query, where, getDocs } = require('firebase/firestore');
      
      const savedAnimeQuery = query(
        collectionGroup(db, 'savedAnime'),
        where('id', '==', animeId)
      );

      const savedAnimeSnapshot = await getDocs(savedAnimeQuery);
      
      const notifications = [];
      savedAnimeSnapshot.docs.forEach((doc: any) => {
        // Extract userId from path: users/{userId}/savedAnime/{animeId}
        const pathParts = doc.ref.path.split('/');
        const userIdIndex = pathParts.indexOf('users');
        const userId = userIdIndex >= 0 && userIdIndex < pathParts.length - 1 
          ? pathParts[userIdIndex + 1] 
          : null;
        
        if (userId && userId !== postAuthor.uid) { // Don't notify the post author
          notifications.push(
            userNotificationService.createNotification({
              userId,
              type: 'post_anime_interest',
              title: `New post about ${animeName}`,
              body: `${postAuthor.displayName || 'Someone'} posted about ${animeName}`,
              data: {
                animeId,
                postId,
                actorId: postAuthor.uid,
                actorName: postAuthor.displayName || 'Anonymous',
                actorPhoto: postAuthor.photoURL || undefined,
              },
            })
          );
        }
      });

      await Promise.all(notifications);
    } catch (err: any) {
      // If collectionGroup query fails (missing index), log but don't throw
      // In production, this should be handled via Cloud Functions
      if (err.code === 'failed-precondition') {
        console.warn('Firestore index required for anime interest notifications. Please create a collection group index for "savedAnime" with field "id"');
      } else {
        console.error('Failed to notify anime interest users:', err);
      }
    }
  },

  async deletePost(userId: string, postId: string): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    const { doc, getDoc, deleteDoc } = require('firebase/firestore');
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }

    if (postSnap.data().userId !== userId) {
      throw new Error('You can only delete your own posts');
    }

    await deleteDoc(postRef);
  },

  async toggleLike(userId: string, postId: string): Promise<boolean> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    const { doc, getDoc, updateDoc, arrayUnion, arrayRemove } = require('firebase/firestore');
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }

    const likes: string[] = postSnap.data().likes || [];
    const isLiked = likes.includes(userId);

    if (isLiked) {
      await updateDoc(postRef, {
        likes: arrayRemove(userId),
      });
      return false;
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(userId),
      });
      return true;
    }
  },

  async getComments(postId: string): Promise<Comment[]> {
    const db = getDb();
    if (!db) {
      return [];
    }

    try {
      const { collection, query, orderBy, getDocs } = require('firebase/firestore');
      const q = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      return [];
    }
  },

  async addComment(
    user: UserInfo,
    postId: string,
    content: string
  ): Promise<Comment> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    const { collection, addDoc, doc, updateDoc, increment } = require('firebase/firestore');

    const commentData = {
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userPhoto: user.photoURL || null,
      content,
      createdAt: Date.now(),
    };

    const commentRef = await addDoc(
      collection(db, 'posts', postId, 'comments'),
      commentData
    );

    // Increment comment count on the post
    await updateDoc(doc(db, 'posts', postId), {
      commentCount: increment(1),
    });

    const newComment = {
      id: commentRef.id,
      ...commentData,
    };

    // Trigger notifications
    try {
      await this.notifyCommentUsers(postId, newComment.id, user);
    } catch (err) {
      console.error('Failed to send comment notifications:', err);
      // Don't fail the comment creation if notifications fail
    }

    return newComment;
  },

  /**
   * Notify users about comments on their posts or posts they commented on
   */
  async notifyCommentUsers(
    postId: string,
    commentId: string,
    commentAuthor: UserInfo
  ): Promise<void> {
    const db = getDb();
    if (!db) {
      return;
    }

    try {
      const { doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');
      
      // Get the post
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        return;
      }

      const postData = postSnap.data();
      const notifications = [];

      // Notify post author (if not the comment author)
      if (postData.userId !== commentAuthor.uid) {
        notifications.push(
          userNotificationService.createNotification({
            userId: postData.userId,
            type: 'comment_on_post',
            title: 'New comment on your post',
            body: `${commentAuthor.displayName || 'Someone'} commented on your post`,
            data: {
              postId,
              commentId,
              actorId: commentAuthor.uid,
              actorName: commentAuthor.displayName || 'Anonymous',
              actorPhoto: commentAuthor.photoURL || undefined,
            },
          })
        );
      }

      // Notify users who commented on this post (excluding post author and comment author)
      const commentsQuery = query(
        collection(db, 'posts', postId, 'comments')
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      
      const notifiedUserIds = new Set([postData.userId, commentAuthor.uid]);
      
      commentsSnapshot.docs.forEach((commentDoc: any) => {
        const commentData = commentDoc.data();
        const commentUserId = commentData.userId;
        
        // Don't notify the post author (already notified), comment author, or duplicate users
        if (!notifiedUserIds.has(commentUserId) && commentUserId !== commentAuthor.uid) {
          notifiedUserIds.add(commentUserId);
          notifications.push(
            userNotificationService.createNotification({
              userId: commentUserId,
              type: 'comment_on_commented_post',
              title: 'New comment on post you commented on',
              body: `${commentAuthor.displayName || 'Someone'} also commented`,
              data: {
                postId,
                commentId,
                actorId: commentAuthor.uid,
                actorName: commentAuthor.displayName || 'Anonymous',
                actorPhoto: commentAuthor.photoURL || undefined,
              },
            })
          );
        }
      });

      await Promise.all(notifications);
    } catch (err) {
      console.error('Failed to notify comment users:', err);
    }
  },

  async deleteComment(userId: string, postId: string, commentId: string): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Not available on this platform');
    }

    const { doc, getDoc, deleteDoc, updateDoc, increment } = require('firebase/firestore');
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }

    if (commentSnap.data().userId !== userId) {
      throw new Error('You can only delete your own comments');
    }

    await deleteDoc(commentRef);

    // Decrement comment count on the post
    await updateDoc(doc(db, 'posts', postId), {
      commentCount: increment(-1),
    });
  },

  getMockPosts(): Post[] {
    const now = Date.now();
    return [
      {
        id: '1',
        userId: 'mock1',
        userName: 'AnimeEnthusiast',
        content: 'Just finished watching Solo Leveling and it was absolutely amazing! The animation quality is top-notch. What are your thoughts?',
        animeName: 'Solo Leveling',
        likes: ['user1', 'user2', 'user3'],
        commentCount: 5,
        createdAt: now - 1000 * 60 * 30, // 30 min ago
      },
      {
        id: '2',
        userId: 'mock2',
        userName: 'MangaReader',
        content: 'Looking for anime recommendations similar to Jujutsu Kaisen. Any suggestions?',
        animeName: 'Jujutsu Kaisen',
        likes: ['user1'],
        commentCount: 12,
        createdAt: now - 1000 * 60 * 60 * 2, // 2 hours ago
      },
      {
        id: '3',
        userId: 'mock3',
        userName: 'NewbieFan',
        content: 'Just started getting into anime! Currently watching One Piece and I\'m already hooked. This community is so welcoming!',
        animeName: 'One Piece',
        likes: ['user1', 'user2', 'user3', 'user4', 'user5'],
        commentCount: 8,
        createdAt: now - 1000 * 60 * 60 * 5, // 5 hours ago
      },
      {
        id: '4',
        userId: 'mock4',
        userName: 'StudioGhibliFan',
        content: 'Spirited Away remains one of the greatest animated films ever made. The storytelling is just timeless.',
        animeName: 'Spirited Away',
        likes: ['user1', 'user2'],
        commentCount: 3,
        createdAt: now - 1000 * 60 * 60 * 24, // 1 day ago
      },
    ];
  },

  formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  },
};
