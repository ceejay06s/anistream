# Firebase Storage CORS Configuration Fix

## Problem
When uploading files to Firebase Storage from the web app, you may encounter CORS errors:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' 
from origin 'http://localhost:8081' has been blocked by CORS policy
```

## Solution

Firebase Storage requires CORS configuration to allow uploads from web browsers. Here's how to fix it:

### Option 1: Configure CORS via Firebase Console (Recommended)

1. **Install Google Cloud SDK** (if not already installed):
   ```bash
   # Windows (PowerShell)
   (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
   & $env:Temp\GoogleCloudSDKInstaller.exe
   ```

2. **Create a CORS configuration file** (`cors.json`):
   ```json
   [
     {
       "origin": ["http://localhost:8081", "http://localhost:19006", "https://anistream-pink.vercel.app"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
     }
   ]
   ```

3. **Apply CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://aniwatch-76fd3.firebasestorage.app
   ```

### Option 2: Configure via Firebase Console (Alternative)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `aniwatch-76fd3`
3. Go to **Storage** → **Rules**
4. Ensure your storage rules allow authenticated uploads:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         // Allow authenticated users to upload files
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

5. For CORS, you still need to use `gsutil` (Option 1) as Firebase Console doesn't have a CORS UI.

### Option 3: Use Backend Proxy (If CORS can't be configured)

If you can't configure CORS, we can create a backend endpoint to proxy uploads:

1. The backend would receive the file
2. Upload it to Firebase Storage using Admin SDK
3. Return the download URL

This requires backend changes but avoids CORS issues entirely.

## Verification

After configuring CORS, test file uploads:
1. Log in to your app
2. Try uploading an image in a post
3. Check browser console for CORS errors

## Notes

- CORS configuration applies to the entire Storage bucket
- Make sure to include all your domains (localhost for dev, production domain)
- The `maxAgeSeconds` controls how long browsers cache CORS preflight responses
- `responseHeader` includes headers that the browser is allowed to access

## Troubleshooting

If uploads still fail:
1. Verify the user is authenticated: `auth.currentUser` should not be null
2. Check Firebase Storage rules allow authenticated writes
3. Verify the CORS configuration was applied: `gsutil cors get gs://aniwatch-76fd3.firebasestorage.app`
4. Clear browser cache and try again
5. Check browser console for specific error messages
