# Fix Render Deployment Error

## Problem
Render is looking for `package.json` in the wrong directory. The error shows:
```
npm error path /opt/render/project/src/package.json
npm error errno -2
```

## Solution

You need to set the **Root Directory** in Render Dashboard.

### Option 1: Update in Render Dashboard (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your service: `anistream-backend`
3. Go to **Settings**
4. Scroll to **Build & Deploy** section
5. Find **Root Directory** field
6. Set it to: `backend-hono`
7. Click **Save Changes**
8. Trigger a new deploy

### Option 2: Use render.yaml (If using Blueprint)

If you're using Render Blueprint (render.yaml), I've created a root `render.yaml` file that specifies `rootDir: backend-hono`.

1. Make sure `render.yaml` is in your repository root
2. The file should have `rootDir: backend-hono` specified
3. Render will automatically use this configuration

### Option 3: Manual Fix

If the above doesn't work:

1. In Render Dashboard → Your Service → Settings
2. **Root Directory**: `backend-hono`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. Save and redeploy

## Verify Configuration

After updating, your Render service should:
- Look for `package.json` in `backend-hono/package.json`
- Run build commands from `backend-hono/` directory
- Start the service from `backend-hono/dist/index.js`

## Test After Fix

Once deployed, test your endpoint:
```bash
curl https://your-service.onrender.com/api/notifications/check-anime-updates
```

## Common Issues

**Still getting errors?**
- Make sure `backend-hono/package.json` exists
- Verify all dependencies are listed in `package.json`
- Check that `tsconfig.json` is in `backend-hono/` directory
- Ensure build output goes to `backend-hono/dist/`
