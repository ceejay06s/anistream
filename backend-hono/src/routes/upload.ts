import { Hono } from 'hono';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getBackblazeClient, BACKBLAZE_BUCKET, getBackblazePublicUrl } from '../config/backblaze.js';

export const uploadRoutes = new Hono();

/**
 * Upload file to Backblaze B2 via backend proxy
 * This avoids CORS issues and uses Backblaze B2 for storage (no Firebase Blaze plan needed)
 */
uploadRoutes.post('/file', async (c) => {
  try {
    // Use formData() for reliable multipart handling (e.g. React Native uploads)
    const formData = await c.req.formData();
    const file = formData.get('file');
    const userId = formData.get('userId') as string | null;
    const folder = (formData.get('folder') as string) || 'posts';

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file provided or invalid file part' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // File | Blob (RN and browsers can send either)
    const fileName = (file as File).name || 'upload';
    const fileType = (file as File).type || '';
    let fileSize = (file as File).size ?? 0;

    // Validate file type
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');
    if (!isImage && !isVideo) {
      return c.json({ error: 'Only image and video files are allowed' }, 400);
    }

    // Convert to buffer (File and Blob both have arrayBuffer())
    const arrayBuffer = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (fileSize === 0) fileSize = buffer.length;

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400);
    }

    // Get file extension
    const fileExtension = fileName.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const filePath = `${folder}/${userId}/${uniqueFileName}`;

    // Upload to Backblaze B2 using S3-compatible API
    const s3Client = getBackblazeClient();

    // Upload the file
    const putCommand = new PutObjectCommand({
      Bucket: BACKBLAZE_BUCKET,
      Key: filePath,
      Body: buffer,
      ContentType: fileType,
      Metadata: {
        originalName: fileName,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(putCommand);

    // Generate signed URL (valid for 5 days - max allowed by S3-compatible services is < 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: BACKBLAZE_BUCKET,
      Key: filePath,
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 432000, // 5 days in seconds (5*24*60*60 = 432000) - safely under 7-day limit
    });

    // Public URL (if bucket is public, otherwise use signed URL)
    const publicUrl = getBackblazePublicUrl(filePath);

    return c.json({
      success: true,
      url: signedUrl, // Use signed URL for private buckets
      publicUrl: publicUrl, // Public URL (if bucket is public)
      type: isVideo ? 'video' : 'image',
      fileName: uniqueFileName,
      filePath,
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return c.json({
      error: 'Failed to upload file',
      message: error.message || 'Unknown error',
    }, 500);
  }
});

/**
 * Get signed URL for a file in Backblaze B2 (for private buckets)
 * This allows retrieving files from a private bucket by generating a temporary signed URL
 */
uploadRoutes.get('/file', async (c) => {
  try {
    const filePath = c.req.query('filePath');

    if (!filePath) {
      return c.json({ error: 'File path is required as query parameter' }, 400);
    }

    const s3Client = getBackblazeClient();

    // Generate signed URL (valid for 5 days - max allowed by S3-compatible services is < 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: BACKBLAZE_BUCKET,
      Key: filePath,
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 432000, // 5 days in seconds (5*24*60*60 = 432000) - safely under 7-day limit
    });

    // Public URL (if bucket is public, otherwise use signed URL)
    const publicUrl = getBackblazePublicUrl(filePath);

    return c.json({
      success: true,
      url: signedUrl, // Use signed URL for private buckets
      publicUrl: publicUrl, // Public URL (if bucket is public)
      filePath,
    });
  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    return c.json({
      error: 'Failed to generate signed URL',
      message: error.message || 'Unknown error',
    }, 500);
  }
});

/**
 * Delete file from Backblaze B2
 */
uploadRoutes.delete('/file', async (c) => {
  try {
    const { filePath } = await c.req.json();

    if (!filePath) {
      return c.json({ error: 'File path is required' }, 400);
    }

    const s3Client = getBackblazeClient();

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BACKBLAZE_BUCKET,
      Key: filePath,
    });

    await s3Client.send(deleteCommand);

    return c.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return c.json({
      error: 'Failed to delete file',
      message: error.message || 'Unknown error',
    }, 500);
  }
});
