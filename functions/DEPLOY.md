# Quick Deploy Guide

## First Time Setup

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Install dependencies**:
   ```bash
   cd functions
   npm install
   ```

4. **Build TypeScript**:
   ```bash
   npm run build
   ```

5. **Create Firestore Index**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Firestore Database → Indexes
   - Create collection group index for `savedAnime` with field `id`

6. **Upgrade to Blaze Plan** (if not already):
   - Firebase Console → Upgrade
   - Select Blaze plan

7. **Deploy**:
   ```bash
   firebase deploy --only functions
   ```

## Subsequent Deployments

Just run:
```bash
firebase deploy --only functions
```

Or from functions directory:
```bash
cd functions
npm run deploy
```

## Testing

Test the manual trigger:
```bash
curl https://[region]-aniwatch-76fd3.cloudfunctions.net/manualAnimeUpdateCheck
```

Replace `[region]` with your function region (usually `us-central1`).
