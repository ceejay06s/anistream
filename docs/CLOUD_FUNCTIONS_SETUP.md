# Firebase Cloud Functions Setup Guide

This guide will help you set up Firebase Cloud Functions for automated notifications and anime update checks.

## Prerequisites

1. **Node.js 18+** installed
2. **Firebase CLI** installed:
   ```bash
   npm install -g firebase-tools
   ```
3. **Firebase project**: `aniwatch-76fd3`
4. **Firebase account** with Blaze plan (pay-as-you-go) - required for Cloud Functions

## Step 1: Login to Firebase

```bash
firebase login
```

## Step 2: Install Dependencies

The functions directory is already set up. Just install dependencies:

```bash
cd functions
npm install
```

## Step 3: Build TypeScript

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `lib/` directory.

## Step 4: Create Firestore Index

You need to create a collection group index for anime interest notifications:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `aniwatch-76fd3`
3. Navigate to **Firestore Database** → **Indexes**
4. Click **Create Index**
5. Configure:
   - **Collection ID**: `savedAnime`
   - **Query scope**: Collection group
   - **Fields to index**:
     - Field: `id`, Order: Ascending
   - Click **Create**

## Step 5: Set Up Billing (Required)

Cloud Functions require a **Blaze plan** (pay-as-you-go):

1. Go to Firebase Console → **Upgrade**
2. Select **Blaze plan** (you'll only pay for what you use)
3. Free tier includes:
   - 2 million invocations/month
   - 400,000 GB-seconds/month
   - 200,000 CPU-seconds/month

**Note**: For most apps, you'll stay within the free tier.

## Step 6: Configure Environment Variables (Optional)

If your API URL is different, set it in Firebase Console:

1. Go to **Functions** → **Configuration**
2. Click **Edit** → **Add variable**
3. Add: `API_BASE_URL` = `https://anistream-backend-blme.onrender.com`

Or set it when deploying:
```bash
firebase functions:config:set api.base_url="https://your-api-url.com"
```

## Step 7: Deploy Functions

From the project root:

```bash
firebase deploy --only functions
```

Or from the functions directory:

```bash
cd functions
npm run deploy
```

This will:
1. Build TypeScript
2. Deploy all functions to Firebase
3. Show you the function URLs

## Step 8: Verify Deployment

1. Go to Firebase Console → **Functions**
2. You should see:
   - `onPostCreated` (Firestore trigger)
   - `onCommentCreated` (Firestore trigger)
   - `checkAnimeUpdates` (Scheduled function)
   - `manualAnimeUpdateCheck` (HTTP function)

## Functions Overview

### 1. `onPostCreated` - Post Notification Trigger
- **Type**: Firestore trigger
- **Trigger**: When a post is created in `posts/{postId}`
- **Action**: Notifies all users who have that anime in their saved list
- **Runs**: Automatically on post creation

### 2. `onCommentCreated` - Comment Notification Trigger
- **Type**: Firestore trigger
- **Trigger**: When a comment is created in `posts/{postId}/comments/{commentId}`
- **Action**: Notifies post author and other commenters
- **Runs**: Automatically on comment creation

### 3. `checkAnimeUpdates` - Scheduled Anime Check
- **Type**: Scheduled function (Pub/Sub)
- **Schedule**: Daily at 2:00 AM UTC
- **Action**: Checks all users' saved anime for new episodes
- **Runs**: Automatically every day

### 4. `manualAnimeUpdateCheck` - Manual Trigger
- **Type**: HTTP function
- **URL**: `https://[region]-aniwatch-76fd3.cloudfunctions.net/manualAnimeUpdateCheck`
- **Action**: Manually trigger anime update check
- **Use**: For testing or manual updates

## Testing

### Test Post Notifications
1. Create a post in Firestore with an `animeId`
2. Check the `notifications` collection
3. Users who have that anime saved should receive notifications

### Test Comment Notifications
1. Add a comment to a post
2. Check notifications for:
   - Post author
   - Other users who commented on the same post

### Test Scheduled Function
Call the manual trigger:
```bash
curl https://[region]-aniwatch-76fd3.cloudfunctions.net/manualAnimeUpdateCheck
```

Or wait for the scheduled time (2 AM UTC daily).

## Monitoring

View function logs:
```bash
firebase functions:log
```

Or in Firebase Console → **Functions** → **Logs**

## Troubleshooting

### Error: "Collection group query requires an index"
- Solution: Create the Firestore index (Step 4)

### Error: "Billing account required"
- Solution: Upgrade to Blaze plan (Step 5)

### Functions not triggering
- Check function logs in Firebase Console
- Verify Firestore rules allow reads
- Ensure function is deployed successfully

### TypeScript build errors
```bash
cd functions
npm run build
```
Check for TypeScript errors and fix them.

## Costs

**Free Tier** (per month):
- 2 million invocations
- 400,000 GB-seconds
- 200,000 CPU-seconds

**Beyond free tier**:
- $0.40 per million invocations
- $0.0000025 per GB-second
- $0.12 per GB network egress

For most apps, you'll stay within the free tier.

## Next Steps

1. Monitor function logs for the first few days
2. Adjust the schedule time if needed (in `animeUpdates.ts`)
3. Add more notification types as needed
4. Consider adding push notifications via FCM

See `functions/README.md` for more details.
