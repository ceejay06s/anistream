# Web Push Notifications Setup

This guide explains how to configure Web Push notifications using VAPID keys.

## VAPID Keys

**Public Key (Frontend)**: `BOGVADtXqA3ANL8EIi9SYcsetjZZ-I3J_saRIIdmj_EOOwGKX8g1KIQTVVgyyok_eu8-6U0Nn6YbSl9y4KxYprE`

**Private Key (Backend/Cloud Functions)**: `COVAz3fM8Z8s_N5fc7UAacoZPez8XdBKh8mmxc7vnM8`

## Configuration

### Frontend (Already Configured)

The public VAPID key is configured in:
- `frontend-native/src/config/firebase.ts` - VAPID_PUBLIC_KEY constant
- `frontend-native/src/services/notificationService.ts` - Uses the key when requesting FCM tokens

### Backend/Cloud Functions

The private key is configured in:
- `functions/src/pushNotifications.ts` - Uses environment variable or config

## Setting Up Environment Variables

### Option 1: Firebase Functions Config (Recommended)

```bash
firebase functions:config:set push.vapid_private_key="COVAz3fM8Z8s_N5fc7UAacoZPez8XdBKh8mmxc7vnM8"
```

Then deploy:
```bash
firebase deploy --only functions
```

### Option 2: Environment Variables

In Firebase Console → Functions → Configuration:
- Add variable: `VAPID_PRIVATE_KEY`
- Value: `COVAz3fM8Z8s_N5fc7UAacoZPez8XdBKh8mmxc7vnM8`

## How It Works

1. **User Registration**: When a user enables notifications, the frontend:
   - Requests browser permission
   - Gets FCM token using the public VAPID key
   - Saves token to Firestore: `users/{userId}/tokens/{tokenId}`

2. **Notification Creation**: When a notification is created in Firestore:
   - `onNotificationCreated` Cloud Function triggers
   - Function sends push notification to user's devices
   - User receives notification even if app is closed

3. **Background Handling**: Service worker (`firebase-messaging-sw.js`) handles:
   - Background notifications
   - Notification clicks
   - Navigation to relevant content

## Testing

1. **Enable notifications** in the app (Profile → Settings → Notifications)
2. **Create a test notification** in Firestore:
   ```javascript
   db.collection('notifications').add({
     userId: 'your-user-id',
     type: 'test',
     title: 'Test Notification',
     body: 'This is a test push notification',
     read: false,
     createdAt: Date.now()
   });
   ```
3. **Check browser** - you should receive a push notification

## Troubleshooting

### Notifications not appearing
- Check browser console for errors
- Verify service worker is registered
- Check FCM token is saved in Firestore
- Verify VAPID keys are correct

### Service Worker Issues
- Ensure `firebase-messaging-sw.js` is in the `public/` directory
- Check browser DevTools → Application → Service Workers
- Verify service worker is active

### Cloud Functions Not Sending
- Check function logs: `firebase functions:log`
- Verify VAPID private key is set in config
- Check user has valid FCM tokens in Firestore

## Security Notes

⚠️ **Important**: 
- The **private key** should NEVER be exposed in frontend code
- Only use it in Cloud Functions/backend
- The **public key** is safe to use in frontend code

## Next Steps

1. Deploy Cloud Functions with VAPID private key configured
2. Test push notifications
3. Monitor function logs for any issues
4. Adjust notification content and timing as needed
