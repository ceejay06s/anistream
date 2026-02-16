# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for automated notifications and anime update checks.

## Setup

1. **Install dependencies**:
   ```bash
   cd functions
   npm install
   ```

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

3. **Test locally** (optional):
   ```bash
   npm run serve
   ```

4. **Deploy to Firebase**:
   ```bash
   npm run deploy
   # Or from root directory:
   firebase deploy --only functions
   ```

## Functions

### 1. `onPostCreated`
- **Trigger**: Firestore document creation on `posts/{postId}`
- **Purpose**: Notifies users who have the anime in their saved list when a new post is created
- **Type**: Firestore trigger

### 2. `onCommentCreated`
- **Trigger**: Firestore document creation on `posts/{postId}/comments/{commentId}`
- **Purpose**: Notifies post author and other commenters when a new comment is added
- **Type**: Firestore trigger

### 3. `checkAnimeUpdates`
- **Trigger**: Scheduled (daily at 2 AM UTC)
- **Purpose**: Checks all users' saved anime for new episodes and creates notifications
- **Type**: Scheduled function (Pub/Sub)
- **Schedule**: Every day at 2:00 AM UTC

### 4. `manualAnimeUpdateCheck`
- **Trigger**: HTTP request
- **Purpose**: Manually trigger anime update check (for testing)
- **Type**: HTTP function
- **URL**: `https://[region]-[project-id].cloudfunctions.net/manualAnimeUpdateCheck`

## Configuration

### Environment Variables

Set in Firebase Console → Functions → Configuration:
- `API_BASE_URL`: Your backend API URL (default: `https://anistream-backend-blme.onrender.com`)

### Firestore Indexes Required

You need to create a collection group index for `savedAnime`:

1. Go to Firebase Console → Firestore → Indexes
2. Click "Create Index"
3. Collection ID: `savedAnime` (select "Collection group")
4. Fields to index:
   - `id` (Ascending)
5. Query scope: Collection group
6. Create the index

## Testing

### Test Post Creation Trigger
1. Create a post in Firestore with an `animeId`
2. Check the `notifications` collection for new notifications

### Test Comment Creation Trigger
1. Add a comment to a post
2. Check notifications for the post author and other commenters

### Test Scheduled Function
1. Use the manual trigger: `https://[region]-[project-id].cloudfunctions.net/manualAnimeUpdateCheck`
2. Or wait for the scheduled time (2 AM UTC daily)

## Monitoring

View function logs:
```bash
firebase functions:log
```

Or in Firebase Console → Functions → Logs

## Costs

Cloud Functions pricing:
- First 2 million invocations/month: Free
- Additional: $0.40 per million invocations
- Compute time: $0.0000025 per GB-second
- Network egress: $0.12 per GB

For most apps, the free tier should be sufficient.
