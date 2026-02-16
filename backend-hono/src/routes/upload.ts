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
    // Get the file from the request
    const body = await c.req.parseBody();
    
    // Hono's parseBody returns File objects for multipart/form-data
    const file = body.file;
    const userId = body.userId as string;
    const folder = (body.folder as string) || 'posts'; // Default to 'posts' folder

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Handle both File and File-like objects from Hono
    const fileName = (file as any).name || 'upload';
    const fileType = (file as any).type || '';
    const fileSize = (file as any).size || 0;

    // Validate file type
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return c.json({ error: 'Only image and video files are allowed' }, 400);
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400);
    }

    // Get file extension
    const fileExtension = fileName.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const filePath = `${folder}/${userId}/${uniqueFileName}`;

    // Convert File to Buffer
    // Hono's parseBody may return different types, handle both
    let buffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if ((file as any).arrayBuffer) {
      const arrayBuffer = await (file as any).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(file)) {
      buffer = file as Buffer;
    } else {
      // Try to read as stream or convert
      buffer = Buffer.from(file as any);
    }

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

    // Generate signed URL (valid for 1 year)
    const getCommand = new GetObjectCommand({
      Bucket: BACKBLAZE_BUCKET,
      Key: filePath,
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 31536000, // 1 year in seconds
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
