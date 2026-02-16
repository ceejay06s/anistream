# Quick Deploy Guide for Render

## Step-by-Step Instructions

### 1. Prepare Service Account Key

Your service account key is already in `src/config/serviceAccountKey.json`. We'll use it as an environment variable in Render.

**Option A: Base64 Encode (Recommended)**

Run this command to get the base64 string:
```powershell
cd backend-hono
$content = Get-Content "src\config\serviceAccountKey.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [Convert]::ToBase64String($bytes)
$base64 | Out-File -FilePath "serviceAccountKey.base64.txt"
```

Then copy the contents of `serviceAccountKey.base64.txt` - you'll paste this in Render.

**Option B: Use JSON Directly**

Copy the entire contents of `src/config/serviceAccountKey.json` as a single string.

### 2. Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository:
   - Click "Connect account" if not connected
   - Select your repository: `anistream`
   - Select branch: `main` (or your default branch)

### 3. Configure Service

**Basic Settings:**
- **Name**: `anistream-backend`
- **Environment**: `Node`
- **Region**: Choose closest region
- **Branch**: `main`
- **Root Directory**: `backend-hono`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 4. Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**:

1. **FIREBASE_SERVICE_ACCOUNT**
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste your base64-encoded service account (from step 1)

2. **NODE_ENV**
   - Key: `NODE_ENV`
   - Value: `production`

3. **ANIME_UPDATE_SECRET_TOKEN** (Optional - for security)
   - Key: `ANIME_UPDATE_SECRET_TOKEN`
   - Value: Generate a random string (e.g., `openssl rand -hex 32`)

### 5. Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (2-5 minutes)
3. Render will show build logs in real-time

### 6. Get Your URL

After deployment, Render provides a URL like:
- `https://anistream-backend.onrender.com`

### 7. Test

Test your endpoint:
```bash
curl https://your-service.onrender.com/api/notifications/check-anime-updates
```

### 8. Set Up Cron Job

**Using cron-job.org (Free):**

1. Go to https://cron-job.org
2. Sign up (free)
3. Create cron job:
   - **Title**: AniStream Update Check
   - **URL**: `https://your-service.onrender.com/api/notifications/check-anime-updates`
   - **Schedule**: Daily at 2:00 AM UTC
   - **Method**: POST
   - **Headers**: 
     ```
     X-Secret-Token: your-secret-token-here
     ```

## Important Notes

⚠️ **Free Tier Limitation**: 
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds (cold start)
- For production, consider paid plan for always-on service

✅ **Security**:
- Never commit service account keys to git
- Use environment variables in Render
- Keep secret tokens secure

## Troubleshooting

**Build fails?**
- Check `package.json` has all dependencies
- Verify Node version (should be 18+)

**Service crashes?**
- Check Render logs
- Verify environment variables are set
- Test Firebase Admin initialization locally first

**Slow first request?**
- Normal on free tier (cold start)
- Upgrade to paid plan for always-on

## Next Steps

1. ✅ Deploy to Render
2. ✅ Test endpoints
3. ✅ Set up cron job
4. ✅ Monitor logs
5. ✅ Set up alerts (optional)
