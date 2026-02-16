import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

let firestoreDb: admin.firestore.Firestore | null = null;

/**
 * Initialize Firebase Admin SDK
 * Tries multiple methods to find service account credentials
 */
function initializeFirebaseAdmin(): admin.firestore.Firestore {
  if (firestoreDb) {
    return firestoreDb;
  }

  // Check if already initialized
  if (admin.apps.length > 0) {
    firestoreDb = admin.firestore();
    return firestoreDb;
  }

  try {
    // Method 1: Try to load service account key from config directory
    const serviceAccountPath = path.join(__dirname, '../config/serviceAccountKey.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firestoreDb = admin.firestore();
      return firestoreDb;
    }

    // Method 2: Try environment variable (base64 encoded) - for Render/cloud deployments
    const envServiceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (envServiceAccountBase64) {
      try {
        const serviceAccountJson = Buffer.from(envServiceAccountBase64, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firestoreDb = admin.firestore();
        return firestoreDb;
      } catch (error) {
        console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT from base64, trying JSON string...');
      }
    }

    // Method 2b: Try environment variable (JSON string) - alternative method
    const envServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (envServiceAccountJson) {
      try {
        const serviceAccount = JSON.parse(envServiceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firestoreDb = admin.firestore();
        return firestoreDb;
      } catch (error) {
        console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON');
      }
    }

    // Method 2c: Try environment variable path
    const envServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (envServiceAccountPath && fs.existsSync(envServiceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(envServiceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firestoreDb = admin.firestore();
      return firestoreDb;
    }

    // Method 3: Try GOOGLE_APPLICATION_CREDENTIALS (for Google Cloud environments)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      firestoreDb = admin.firestore();
      return firestoreDb;
    }

    // Method 4: Try default credentials (for local development with gcloud CLI)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    firestoreDb = admin.firestore();
    return firestoreDb;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw new Error('Firebase Admin initialization failed. Please check your service account configuration.');
  }
}

// Initialize on module load
try {
  firestoreDb = initializeFirebaseAdmin();
} catch (error) {
  console.warn('Firebase Admin not initialized. Some features may not work.');
}

export { firestoreDb, admin };
export default firestoreDb;
