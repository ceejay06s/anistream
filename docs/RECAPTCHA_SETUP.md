# reCAPTCHA Setup Guide

This application uses Google reCAPTCHA v3 to protect authentication and community features from spam and abuse.

## Configuration

### Frontend (Site Key)
The site key is configured in `frontend-native/src/config/recaptcha.ts`:
- **Site Key**: `6Lfx8WwsAAAAAPjYien995uAFbBR_tcrym7BGs7G`

You can also set it via environment variable:
```bash
EXPO_PUBLIC_RECAPTCHA_SITE_KEY=6Lfx8WwsAAAAAPjYien995uAFbBR_tcrym7BGs7G
```

### Backend (Secret Key)
The secret key is configured in `backend-hono/src/utils/recaptcha.ts`:
- **Secret Key**: `6Lfx8WwsAAAAAMyXX1RtdXcCTmrnhTNM1xOA_yjK`

⚠️ **IMPORTANT**: The secret key should be kept secure and never exposed in the frontend!

For production, set it as an environment variable:
```bash
RECAPTCHA_SECRET_KEY=6Lfx8WwsAAAAAMyXX1RtdXcCTmrnhTNM1xOA_yjK
```

## How It Works

1. **Frontend**: When a user performs a protected action (login, signup, create post, add comment), the frontend:
   - Executes reCAPTCHA v3 (invisible) to get a token
   - Sends the token to the backend for verification

2. **Backend**: The backend:
   - Receives the token from the frontend
   - Verifies it with Google's reCAPTCHA API using the secret key
   - Returns verification result

3. **Protection**: The following actions are protected:
   - User sign up
   - User sign in
   - Google sign in
   - Post creation
   - Comment creation

## API Endpoints

### POST `/api/recaptcha/verify`
Verifies a reCAPTCHA token with Google's API.

**Request:**
```json
{
  "token": "reCAPTCHA_token_here",
  "remoteip": "optional_user_ip"
}
```

**Response:**
```json
{
  "success": true,
  "challenge_ts": "2024-01-01T12:00:00Z",
  "hostname": "example.com"
}
```

## Testing

To test reCAPTCHA verification:

1. Start the backend server:
   ```bash
   cd backend-hono
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd frontend-native
   npm start
   ```

3. Try creating a post or comment - reCAPTCHA will run invisibly in the background.

## Troubleshooting

### reCAPTCHA not working
- Check that the site key is correctly set in the frontend config
- Verify the secret key is set in the backend
- Check browser console for any errors
- Ensure you're testing on the web platform (reCAPTCHA doesn't work on native)

### Verification fails
- Check that the backend can reach Google's reCAPTCHA API
- Verify the secret key is correct
- Check backend logs for error messages

## Security Notes

- The secret key should **NEVER** be committed to version control in production
- Use environment variables for sensitive keys
- The frontend only uses the site key (which is safe to expose)
- All token verification happens on the backend using the secret key
