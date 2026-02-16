# VAPID Keys Configuration

## Your VAPID Keys

**Public Key (Certificate)**: `BOGVADtXqA3ANL8EIi9SYcsetjZZ-I3J_saRIIdmj_EOOwGKX8g1KIQTVVgyyok_eu8-6U0Nn6YbSl9y4KxYprE`

**Private Key**: `COVAz3fM8Z8s_N5fc7UAacoZPez8XdBKh8mmxc7vnM8`

## Configuration Status

### ✅ Frontend (Configured)
- Public key is set in `frontend-native/src/config/firebase.ts`
- Used automatically when requesting FCM tokens
- No additional configuration needed

### ✅ Firebase Console (Required)
You need to add these keys in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `aniwatch-76fd3`
3. Go to **Project Settings** → **Cloud Messaging** tab
4. Scroll to **Web Push certificates** section
5. Click **Generate key pair** or **Add key pair**
6. Enter:
   - **Key pair name**: `Web Push VAPID`
   - **Public key**: `BOGVADtXqA3ANL8EIi9SYcsetjZZ-I3J_saRIIdmj_EOOwGKX8g1KIQTVVgyyok_eu8-6U0Nn6YbSl9y4KxYprE`
   - **Private key**: `COVAz3fM8Z8s_N5fc7UAacoZPez8XdBKh8mmxc7vnM8`

## How It Works

1. **Client Side (Frontend)**:
   - Uses public VAPID key to request FCM token
   - Token is saved to Firestore: `users/{userId}/tokens/{tokenId}`

2. **Server Side (Cloud Functions)**:
   - Firebase Admin SDK uses service account (not VAPID keys)
   - Reads FCM tokens from Firestore
   - Sends push notifications via FCM

3. **Service Worker**:
   - Handles background notifications
   - Shows notifications when app is closed
   - Handles notification clicks

## Testing

1. **Enable notifications** in your app
2. **Check Firestore** - you should see a token in `users/{userId}/tokens/`
3. **Create a notification** in Firestore
4. **Check browser** - you should receive a push notification

## Troubleshooting

### "VAPID key is not valid"
- Verify the public key is correct in `firebase.ts`
- Check Firebase Console has the keys configured

### "No FCM tokens found"
- User hasn't enabled notifications
- Check browser console for permission errors
- Verify service worker is registered

### Notifications not appearing
- Check browser notification permissions
- Verify service worker is active
- Check Cloud Functions logs for errors

## Security

- ✅ **Public key** is safe to use in frontend code (already configured)
- ⚠️ **Private key** should only be in Firebase Console (not in code)
- The private key in `pushNotifications.ts` is a fallback - Firebase Admin uses service account by default
