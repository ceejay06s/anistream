# Environment Variables Setup

This guide explains how to set up environment variables for local development.

## Quick Setup

Run the setup script to automatically create `.env` from your service account:

```powershell
.\setup-env.ps1
```

This will:
- Read your service account JSON file
- Encode it to base64
- Create `.env` with `FIREBASE_SERVICE_ACCOUNT`
- Generate a random `ANIME_UPDATE_SECRET_TOKEN`

## Manual Setup

1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Get your base64 service account:
   ```powershell
   .\get-base64-key.ps1
   ```

3. Edit `.env` and paste the base64 string:
   ```
   FIREBASE_SERVICE_ACCOUNT=your-base64-string-here
   ```

## Environment Variables

### Required

- **FIREBASE_SERVICE_ACCOUNT**: Base64 encoded Firebase service account JSON
  - Get it by running: `.\get-base64-key.ps1`
  - Or use `FIREBASE_SERVICE_ACCOUNT_JSON` with raw JSON (see below)

### Optional

- **FIREBASE_SERVICE_ACCOUNT_JSON**: Raw JSON string (alternative to base64)
  - Copy entire JSON from service account file
  - Escape quotes: `\"` instead of `"`
  - Escape newlines: `\\n` instead of actual newlines
  
  Example:
  ```
  FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"aniwatch-76fd3","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",...}
  ```

- **ANIME_UPDATE_SECRET_TOKEN**: Secret token for securing the update endpoint
  - Generate random string: `openssl rand -hex 32`
  - Or let `setup-env.ps1` generate it for you

- **NODE_ENV**: Environment mode
  - `development` for local
  - `production` for deployed

## Priority Order

Firebase Admin SDK initialization tries methods in this order:

1. ✅ Service account file: `src/config/serviceAccountKey.json` (local)
2. ✅ Environment variable (base64): `FIREBASE_SERVICE_ACCOUNT` (from .env or Render)
3. ✅ Environment variable (JSON): `FIREBASE_SERVICE_ACCOUNT_JSON` (from .env)
4. ✅ Environment variable path: `FIREBASE_SERVICE_ACCOUNT_PATH`
5. ✅ Google Cloud default credentials

## Security

⚠️ **Important**:
- `.env` is in `.gitignore` - never commit it
- Never commit service account keys
- Use different keys for dev/prod if possible
- Rotate keys if accidentally exposed

## Troubleshooting

**Firebase Admin not initializing?**
- Check `.env` file exists and has correct values
- Verify base64 encoding is correct
- Check console logs for specific errors

**dotenv not loading?**
- Run `npm install` to ensure `dotenv` is installed
- Check `package.json` includes `dotenv` dependency

**Service account invalid?**
- Verify JSON is valid
- Check base64 encoding is correct
- Ensure no extra whitespace in `.env` values
