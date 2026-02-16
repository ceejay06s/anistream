# Notification System Without Blaze Plan

Since you don't want to upgrade to the Blaze plan, here's how to set up notifications using your existing backend instead of Cloud Functions.

## Solution Overview

Instead of using Firebase Cloud Functions (which require Blaze), we'll use:
1. **Your backend server** (`backend-hono`) for scheduled anime update checks
2. **Firestore triggers** (if available on Spark) OR client-side triggers for post/comment notifications
3. **External cron service** to call your backend endpoint

## Setup

### 1. Install Firebase Admin in Backend

```bash
cd backend-hono
npm install firebase-admin
```

### 2. Configure Firebase Admin

Create `backend-hono/src/config/firebase.ts`:

```typescript
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
// Option 1: Use service account key file
// admin.initializeApp({
//   credential: admin.credential.cert(require('./serviceAccountKey.json'))
// });

// Option 2: Use default credentials (if running on Google Cloud)
// admin.initializeApp();

// Option 3: Use environment variable
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export const db = admin.firestore();
export { admin };
```

**Get Service Account Key:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `backend-hono/src/config/serviceAccountKey.json`
4. Add to `.gitignore`!

### 3. Backend Endpoint Created

✅ Already created: `POST /api/notifications/check-anime-updates`

This endpoint:
- Checks all users' saved anime for updates
- Creates notifications in Firestore
- Returns summary of updates found

### 4. Set Up Cron Job

You have several options:

#### Option A: External Cron Service (Recommended - Free)

Use a free cron service like:
- **cron-job.org** (free)
- **EasyCron** (free tier)
- **UptimeRobot** (free)

**Setup:**
1. URL: `https://anistream-backend-blme.onrender.com/api/notifications/check-anime-updates`
2. Method: POST
3. Schedule: Daily at 2 AM UTC (or your preferred time)
4. Optional: Add header `X-Secret-Token: your-secret-token` for security

#### Option B: Your Hosting Provider's Cron

If you're using Render, Railway, or similar:
- Check if they support cron jobs
- Set up a scheduled task to call your endpoint

#### Option C: Client-Side Polling (Simple but less efficient)

Users' devices check for updates when they open the app.

### 5. Post/Comment Notifications

For post and comment notifications, you have two options:

#### Option A: Keep Firestore Triggers (if Spark plan supports them)

The Cloud Functions `onPostCreated` and `onCommentCreated` might work on Spark plan. Try deploying just those:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:onPostCreated,functions:onCommentCreated
```

#### Option B: Client-Side Triggers (No Blaze needed)

When a user creates a post/comment, the frontend can:
1. Create the post/comment in Firestore
2. Immediately trigger notification creation for interested users
3. This happens client-side, no Cloud Functions needed

## Testing

### Test Anime Update Check

```bash
curl -X POST https://anistream-backend-blme.onrender.com/api/notifications/check-anime-updates
```

Or with secret token:
```bash
curl -X POST https://anistream-backend-blme.onrender.com/api/notifications/check-anime-updates \
  -H "X-Secret-Token: your-secret-token"
```

## Security

Set a secret token to prevent unauthorized access:

```bash
# In your backend environment
export ANIME_UPDATE_SECRET_TOKEN="your-random-secret-token"
```

Then use it in your cron job:
- Header: `X-Secret-Token: your-random-secret-token`

## What Works Without Blaze

✅ **Anime Update Checks** - Via backend endpoint + cron
✅ **Post/Comment Notifications** - Via client-side triggers OR Firestore triggers (if Spark supports)
✅ **Push Notifications** - Via backend when notifications are created
✅ **Real-time Notifications** - Firestore listeners work on Spark plan

## What Requires Blaze

❌ **Scheduled Cloud Functions** - Requires Blaze (but we moved this to backend)
❌ **Pub/Sub triggers** - Requires Blaze (not needed with our solution)

## Next Steps

1. Install `firebase-admin` in backend
2. Set up service account key
3. Deploy backend with new endpoint
4. Set up cron job to call the endpoint daily
5. Test the endpoint manually first

See `CLOUD_FUNCTIONS_SETUP.md` for details on Firestore triggers (which might work on Spark).
