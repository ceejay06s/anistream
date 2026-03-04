import { Platform } from 'react-native';
import { app } from '@/config/firebase';

/** Web: File; Native: { uri, type?, name? } for FormData (expo-image-picker result) */
export type ProfilePhotoInput = File | { uri: string; type?: string; name?: string };

function isNativePhotoInput(input: ProfilePhotoInput): input is { uri: string; type?: string; name?: string } {
  return typeof input === 'object' && 'uri' in input && typeof (input as any).uri === 'string';
}

// Lazy initialization to avoid module load order issues
function getStorage() {
  if (!app) {
    return null;
  }
  const { getStorage } = require('firebase/storage');
  return getStorage(app);
}

/**
 * Uploads a profile photo to Firebase Storage via backend proxy.
 * Supports web (File) and native (expo-image-picker uri object).
 * @param file The image file (web) or { uri, type?, name? } (native)
 * @param userId The user's ID
 * @returns The download URL of the uploaded photo
 */
export async function uploadProfilePhoto(
  file: ProfilePhotoInput,
  userId: string
): Promise<string> {
  const { API_BASE_URL } = require('./api');

  if (isNativePhotoInput(file)) {
    const type = file.type || 'image/jpeg';
    if (!type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type,
      name: file.name || 'photo.jpg',
    } as any);
    formData.append('userId', userId);
    formData.append('folder', 'profiles');

    const response = await fetch(`${API_BASE_URL}/api/upload/file`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
    const data = await response.json().catch(() => ({}));
    if (data.success) return data.url;
    if (response.status === 400) throw new Error(data.error || 'Invalid file or request');
    if (response.status === 413) throw new Error('Image size must be less than 5MB');
    throw new Error(data.error || 'Upload failed');
  }

  // Web: File
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 5MB');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);
  formData.append('folder', 'profiles');

  const response = await fetch(`${API_BASE_URL}/api/upload/file`, {
    method: 'POST',
    body: formData,
    headers: {},
  });
  const data = await response.json().catch(() => ({}));
  if (data.success) return data.url;
  if (response.status === 400) throw new Error(data.error || 'Invalid file or request');
  if (response.status === 413) throw new Error('Image size must be less than 5MB');
  throw new Error(data.error || 'Upload failed');
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
