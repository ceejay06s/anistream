import { Platform } from 'react-native';
import { app } from '@/config/firebase';

// Lazy initialization to avoid module load order issues
function getStorage() {
  if (Platform.OS !== 'web' || !app) {
    return null;
  }
  const { getStorage } = require('firebase/storage');
  return getStorage(app);
}

/**
 * Uploads a profile photo to Firebase Storage via backend proxy
 * This avoids CORS issues and doesn't require Blaze plan
 * @param file The image file to upload
 * @param userId The user's ID
 * @returns The download URL of the uploaded photo
 */
export async function uploadProfilePhoto(
  file: File,
  userId: string
): Promise<string> {
  // Use backend proxy to avoid CORS issues (no Blaze plan needed)
  const { API_BASE_URL } = require('./api');
  const axios = require('axios');

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB for profile photos)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 5MB');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('folder', 'profiles');

    const response = await axios.post(`${API_BASE_URL}/api/upload/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      return response.data.url;
    } else {
      throw new Error(response.data.error || 'Upload failed');
    }
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || 'Invalid file or request');
    } else if (error.response?.status === 413) {
      throw new Error('Image size must be less than 5MB');
    } else {
      throw new Error(`Upload failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Deletes a profile photo from Firebase Storage
 * @param photoURL The URL of the photo to delete
 * @param userId The user's ID
 */
export async function deleteProfilePhoto(
  photoURL: string,
  userId: string
): Promise<void> {
  const storage = getStorage();
  if (!storage) {
    return; // Silently fail if storage not available
  }

  try {
    const { ref, deleteObject } = require('firebase/storage');
    
    // Extract the file path from the URL
    // Firebase Storage URLs are in format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlObj = new URL(photoURL);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
    
    if (pathMatch && pathMatch[1]) {
      const decodedPath = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, decodedPath);
      await deleteObject(storageRef);
    }
  } catch (error) {
    console.error('Failed to delete profile photo:', error);
    // Don't throw - deletion is not critical
  }
}
