import * as admin from 'firebase-admin';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production' || process.env.LOAD_DOTENV === 'true') {
  dotenv.config();
}

const configDir = dirname(fileURLToPath(import.meta.url));

function tryParseJson(raw: string): Record<string, any> | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readJsonFile(pathname: string): Record<string, any> | null {
  if (!existsSync(pathname)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(pathname, 'utf8'));
  } catch (error) {
    console.warn(`Failed to parse Firebase service account file: ${pathname}`, error);
    return null;
  }
}

function loadServiceAccountFromEnv(): Record<string, any> | null {
  const base64Payload = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (base64Payload) {
    const decoded = Buffer.from(base64Payload, 'base64').toString('utf8');
    const parsedBase64 = tryParseJson(decoded);
    if (parsedBase64) {
      return parsedBase64;
    }

    const parsedRaw = tryParseJson(base64Payload);
    if (parsedRaw) {
      return parsedRaw;
    }

    console.warn('FIREBASE_SERVICE_ACCOUNT is set but cannot be parsed as base64 JSON or raw JSON.');
  }

  const jsonPayload = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonPayload) {
    const normalized = jsonPayload.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const parsed = tryParseJson(normalized);
    if (parsed) {
      return parsed;
    }
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON is set but cannot be parsed.');
  }

  const filePathFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePathFromEnv) {
    return readJsonFile(filePathFromEnv);
  }

  return null;
}

let firestoreDb: admin.firestore.Firestore | null = null;

function initializeFirebaseAdmin(): admin.firestore.Firestore {
  if (firestoreDb) {
    return firestoreDb;
  }

  if (admin.apps.length > 0) {
    firestoreDb = admin.firestore();
    return firestoreDb;
  }

  const localServiceAccount = readJsonFile(join(configDir, 'serviceAccountKey.json'));
  const envServiceAccount = loadServiceAccountFromEnv();

  if (localServiceAccount || envServiceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert((localServiceAccount || envServiceAccount) as admin.ServiceAccount),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  firestoreDb = admin.firestore();
  return firestoreDb;
}

try {
  firestoreDb = initializeFirebaseAdmin();
} catch (error) {
  console.warn('Firebase Admin not initialized. Some features may not work.', error);
}

export { firestoreDb, admin };
export default firestoreDb;
