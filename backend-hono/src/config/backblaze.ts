import { S3Client } from '@aws-sdk/client-s3';

// Backblaze B2 Configuration
// Get these from Backblaze B2 Console: https://secure.backblaze.com/user_buckets.htm
const BACKBLAZE_KEY_ID = process.env.BACKBLAZE_KEY_ID || '';
const BACKBLAZE_APPLICATION_KEY = process.env.BACKBLAZE_APPLICATION_KEY || '';
const BACKBLAZE_BUCKET_NAME = process.env.BACKBLAZE_BUCKET_NAME || 'anistream-bckt';
const BACKBLAZE_ENDPOINT = process.env.BACKBLAZE_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';
const BACKBLAZE_REGION = process.env.BACKBLAZE_REGION || 'us-east-005';

let s3Client: S3Client | null = null;

/**
 * Initialize Backblaze B2 S3 Client
 */
export function getBackblazeClient(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  if (!BACKBLAZE_KEY_ID || !BACKBLAZE_APPLICATION_KEY) {
    throw new Error('Backblaze credentials not configured. Please set BACKBLAZE_KEY_ID and BACKBLAZE_APPLICATION_KEY environment variables.');
  }

  s3Client = new S3Client({
    endpoint: BACKBLAZE_ENDPOINT,
    region: BACKBLAZE_REGION,
    credentials: {
      accessKeyId: BACKBLAZE_KEY_ID,
      secretAccessKey: BACKBLAZE_APPLICATION_KEY,
    },
    forcePathStyle: true, // Required for Backblaze B2
  });

  return s3Client;
}

export const BACKBLAZE_BUCKET = BACKBLAZE_BUCKET_NAME;

/**
 * Get public URL for a file in Backblaze B2
 * Format for public buckets: https://[bucket-name].s3.[region].backblazeb2.com/[file-path]
 * Format for private buckets: Use signed URLs (generated in upload route)
 */
export function getBackblazePublicUrl(filePath: string): string {
  // Backblaze B2 public URL format (for public buckets)
  // Format: https://[bucket-name].s3.[region].backblazeb2.com/[file-path]
  const bucketName = BACKBLAZE_BUCKET_NAME;
  const region = BACKBLAZE_REGION;
  
  // Extract region number from endpoint (e.g., "us-east-005" from "s3.us-east-005.backblazeb2.com")
  // For public buckets, use this format:
  return `https://${bucketName}.s3.${region}.backblazeb2.com/${filePath}`;
  
  // Note: For private buckets (current setup), signed URLs are used instead
  // Signed URLs are generated in the upload/get routes with 7-day expiration (max allowed)
}
