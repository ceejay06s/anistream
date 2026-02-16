# Firebase Configuration

This directory contains Firebase service account configuration.

## Service Account Key

Place your Firebase service account key file here as `serviceAccountKey.json`.

**Important**: This file contains sensitive credentials and should NEVER be committed to git.

The file should be in the format:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  ...
}
```

## How to Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `serviceAccountKey.json` in this directory

## Alternative: Environment Variable

You can also set the path via environment variable:
```bash
export FIREBASE_SERVICE_ACCOUNT_PATH="/path/to/serviceAccountKey.json"
```

## Security

- ✅ Already added to `.gitignore`
- ⚠️ Never commit this file to version control
- ⚠️ Keep this file secure and private
- ⚠️ Rotate keys if accidentally exposed
