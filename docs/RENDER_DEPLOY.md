# Deploying Backend to Render

This guide will help you deploy your backend-hono service to Render.

## Prerequisites

1. A Render account (sign up at [render.com](https://render.com))
2. Your Firebase service account key
3. Your backend code ready to deploy

## Step 1: Prepare Service Account Key

Instead of uploading the file, we'll use environment variables (more secure).

### Option A: Base64 Encode (Recommended)

1. Encode your service account JSON to base64:
   ```bash
   # On Windows PowerShell:
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("src/config/serviceAccountKey.json"))
   
   # On Linux/Mac:
   base64 -i src/config/serviceAccountKey.json
   ```

2. Copy the output - you'll use this in Render

### Option B: JSON String (Alternative)

Copy the entire JSON content as a single-line string (escape quotes if needed).

## Step 2: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository (GitHub/GitLab/Bitbucket)
4. Select your repository and branch

## Step 3: Configure Service Settings

### Basic Settings:
- **Name**: `anistream-backend` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend-hono`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### Environment Variables:

Add these in Render Dashboard → Environment:

1. **FIREBASE_SERVICE_ACCOUNT** (Base64 encoded)
   - Value: Your base64-encoded service account JSON
   - Or use JSON string method below

2. **PORT** (Optional - Render sets this automatically)
   - Value: `10000` (or leave default)

3. **NODE_ENV**
   - Value: `production`

4. **ANIME_UPDATE_SECRET_TOKEN** (Optional - for cron security)
   - Value: Generate a random secret token
   - Example: `openssl rand -hex 32`

### Alternative: JSON String Method

If you prefer to use JSON string instead of base64:

1. **FIREBASE_SERVICE_ACCOUNT_JSON**
   - Value: Your entire service account JSON as a single string
   - Make sure to escape quotes properly

## Step 4: Update Firebase Config for Render

We need to update the Firebase config to read from environment variables:

```typescript
// backend-hono/src/config/firebase.ts
// Add this method to read from environment variable
```

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repo
   - Install dependencies
   - Build your project
   - Start the service

3. Wait for deployment to complete (usually 2-5 minutes)

## Step 6: Get Your Service URL

After deployment, Render will provide a URL like:
- `https://anistream-backend.onrender.com`

## Step 7: Test the Endpoint

Test your anime update endpoint:

```bash
curl -X POST https://your-service.onrender.com/api/notifications/check-anime-updates
```

## Step 8: Set Up Cron Job

Use a free cron service to call your endpoint daily:

### Option A: cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org)
2. Sign up (free)
3. Create new cron job:
   - **Title**: AniStream Anime Update Check
   - **URL**: `https://your-service.onrender.com/api/notifications/check-anime-updates`
   - **Schedule**: Daily at 2:00 AM UTC
   - **Method**: POST
   - **Headers**: 
     - `X-Secret-Token: your-secret-token` (if you set ANIME_UPDATE_SECRET_TOKEN)

### Option B: Render Cron Job (Paid Feature)

If you have a paid Render plan, you can use Render's built-in cron jobs.

## Troubleshooting

### Service Account Not Working

1. Check environment variable is set correctly
2. Verify base64 encoding is correct
3. Check Render logs for errors

### Build Fails

1. Check `package.json` scripts are correct
2. Verify all dependencies are listed
3. Check Node version compatibility

### Service Crashes

1. Check Render logs
2. Verify Firebase Admin initialization
3. Check environment variables are set

## Monitoring

- **Logs**: View in Render Dashboard → Your Service → Logs
- **Metrics**: Monitor CPU, Memory, Network usage
- **Alerts**: Set up alerts for service downtime

## Updating Service Account

If you need to update the service account:

1. Go to Render Dashboard → Your Service → Environment
2. Update `FIREBASE_SERVICE_ACCOUNT` variable
3. Click "Save Changes"
4. Service will automatically redeploy

## Security Best Practices

✅ Use environment variables (not files in repo)
✅ Use secret tokens for cron endpoints
✅ Keep service account key secure
✅ Rotate keys periodically
✅ Monitor access logs

## Cost

- **Free Tier**: 
  - Services spin down after 15 minutes of inactivity
  - First request after spin-down takes ~30 seconds
  - Good for development/testing
  
- **Paid Plans**: 
  - Services stay always-on
  - Faster response times
  - Better for production

## Next Steps

1. Deploy to Render
2. Test endpoints
3. Set up cron job
4. Monitor logs
5. Set up alerts (optional)
