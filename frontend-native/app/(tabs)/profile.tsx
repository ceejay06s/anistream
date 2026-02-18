import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  ScrollView,
  Switch,
  Linking,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { savedAnimeService, SavedAnime, CollectionStatus, COLLECTION_LABELS } from '@/services/savedAnimeService';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { notificationService } from '@/services/notificationService';
import { userSettingsService } from '@/services/userSettingsService';
import { executeRecaptcha } from '@/utils/recaptcha';
import { isRecaptchaEnabled, RECAPTCHA_SITE_KEY } from '@/config/recaptcha';
import { verifyRecaptchaToken } from '@/services/recaptchaService';
import { uploadProfilePhoto } from '@/services/profileService';
import { userNotificationService, UserNotification } from '@/services/userNotificationService';
import { NotificationBell } from '@/components/NotificationBell';

type AuthMode = 'login' | 'signup' | 'passwordless';
type ProfileTab = 'saved' | 'settings';

const COLLECTION_ICONS: Record<CollectionStatus, keyof typeof Ionicons.glyphMap> = {
  watching: 'play-circle',
  plan_to_watch: 'time',
  completed: 'checkmark-circle',
  on_hold: 'pause-circle',
  dropped: 'close-circle',
};

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    sendSignInLink,
    completeSignInWithLink,
    isSignInWithEmailLink,
    updateEmail,
    updatePassword,
    updateProfile,
    deleteAccount,
    reauthenticate,
    setPassword,
    sendPasswordReset,
  } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>('passwordless');
  const [profileTab, setProfileTab] = useState<ProfileTab>('saved');
  const [email, setEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Saved anime
  const [savedAnime, setSavedAnime] = useState<SavedAnime[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [collectionTab, setCollectionTab] = useState<CollectionStatus>('watching');
  const [showStatusPicker, setShowStatusPicker] = useState<string | null>(null);

  // Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [registeringNotifications, setRegisteringNotifications] = useState(false);

  // Modals
  const [showFAQ, setShowFAQ] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugReportText, setBugReportText] = useState('');

  // Account management modals
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newSetPassword, setNewSetPassword] = useState('');
  const [confirmSetPassword, setConfirmSetPassword] = useState('');
  const [showUpdateProfile, setShowUpdateProfile] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [updatingAccount, setUpdatingAccount] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  // Load saved anime and settings when user logs in
  useEffect(() => {
    if (user) {
      loadSavedAnime();
      loadUserSettings();
    }
  }, [user]);

  const loadSavedAnime = async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const anime = await savedAnimeService.getSavedAnime(user.uid);
      setSavedAnime(anime);
    } catch (err) {
      console.error('Failed to load saved anime:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const loadUserSettings = async () => {
    if (!user) return;
    try {
      const settings = await userSettingsService.getSettings(user.uid);
      setNotificationsEnabled(settings.notificationsEnabled);
      setAutoPlayEnabled(settings.autoPlayEnabled);
    } catch (err) {
      console.error('Failed to load user settings:', err);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user) return;

    if (enabled) {
      setRegisteringNotifications(true);
      try {
        const token = await notificationService.registerForPushNotifications(user.uid);
        if (token) {
          setNotificationsEnabled(true);
          await userSettingsService.setNotificationsEnabled(user.uid, true);
          setSuccess('Notifications enabled!');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Failed to enable notifications. Please check browser permissions.');
          setTimeout(() => setError(''), 5000);
        }
      } catch (err) {
        console.error('Failed to register notifications:', err);
        setError('Failed to enable notifications');
        setTimeout(() => setError(''), 5000);
      } finally {
        setRegisteringNotifications(false);
      }
    } else {
      setNotificationsEnabled(false);
      try {
        await userSettingsService.setNotificationsEnabled(user.uid, false);
      } catch (err) {
        console.error('Failed to save notification setting:', err);
      }
    }
  };

  // Check for email sign-in link on mount
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const link = window.location.href;
      if (isSignInWithEmailLink(link)) {
        let emailFromStorage = window.localStorage.getItem('emailForSignIn');
        if (!emailFromStorage) {
          emailFromStorage = window.prompt('Please provide your email for confirmation');
        }
        if (emailFromStorage) {
          completeSignInWithLink(emailFromStorage, link)
            .then(() => {
              window.history.replaceState({}, '', window.location.pathname);
            })
            .catch((err: any) => {
              setError(err.message || 'Failed to complete sign in');
            });
        }
      }
    }
  }, []);

  const handlePasswordlessSubmit = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await sendSignInLink(email);
      setSuccess('Check your email for the sign-in link!');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send sign-in link');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!email || !passwordInput) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      // Verify reCAPTCHA if enabled
      if (isRecaptchaEnabled() && Platform.OS === 'web') {
        try {
          const action = authMode === 'login' ? 'login' : 'signup';
          const token = await executeRecaptcha(RECAPTCHA_SITE_KEY, action);
          // Verify token with backend
          const isValid = await verifyRecaptchaToken(token);
          if (!isValid) {
            throw new Error('reCAPTCHA verification failed');
          }
        } catch (recaptchaError) {
          console.warn('reCAPTCHA verification failed:', recaptchaError);
          // Continue with authentication even if reCAPTCHA fails
          // In production, you might want to block the request
        }
      }

      if (authMode === 'login') {
        await signIn(email, passwordInput);
      } else {
        await signUp(email, passwordInput);
      }
      setEmail('');
      setPasswordInput('');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else {
        setError(err.message || 'Failed to send reset email');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      // Verify reCAPTCHA if enabled
      if (isRecaptchaEnabled() && Platform.OS === 'web') {
        try {
          const token = await executeRecaptcha(RECAPTCHA_SITE_KEY, 'google_signin');
          // Verify token with backend
          const isValid = await verifyRecaptchaToken(token);
          if (!isValid) {
            throw new Error('reCAPTCHA verification failed');
          }
        } catch (recaptchaError) {
          console.warn('reCAPTCHA verification failed:', recaptchaError);
          // Continue with authentication even if reCAPTCHA fails
        }
      }

      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSavedAnime([]);
      setNotificationsEnabled(false);
      setAutoPlayEnabled(true);
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
    }
  };

  const handleAnimePress = (anime: SavedAnime) => {
    router.push({
      pathname: '/detail/[id]',
      params: { id: anime.id },
    });
  };

  const handleRemoveSaved = async (animeId: string) => {
    if (!user) return;
    try {
      await savedAnimeService.unsaveAnime(user.uid, animeId);
      setSavedAnime(prev => prev.filter(a => a.id !== animeId));
    } catch (err) {
      console.error('Failed to remove anime:', err);
    }
  };

  const handleStatusChange = async (animeId: string, newStatus: CollectionStatus) => {
    if (!user) return;
    try {
      await savedAnimeService.updateAnimeStatus(user.uid, animeId, newStatus);
      setSavedAnime(prev => prev.map(a =>
        a.id === animeId ? { ...a, status: newStatus } : a
      ));
      setShowStatusPicker(null);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleToggleNotifications = async (animeId: string, notify: boolean) => {
    if (!user) return;
    try {
      await savedAnimeService.toggleNotifications(user.uid, animeId, notify);
      setSavedAnime(prev => prev.map(a =>
        a.id === animeId ? { ...a, notifyOnUpdate: notify } : a
      ));
    } catch (err) {
      console.error('Failed to toggle notifications:', err);
    }
  };

  // Filter anime by current collection tab
  const filteredAnime = savedAnime.filter(a => a.status === collectionTab);

  // Get count for each collection
  const collectionCounts = savedAnime.reduce((acc, anime) => {
    acc[anime.status] = (acc[anime.status] || 0) + 1;
    return acc;
  }, {} as Record<CollectionStatus, number>);

  const handleBugReport = () => {
    if (!bugReportText.trim()) return;
    // Open email client with bug report
    const subject = encodeURIComponent('AniStream Bug Report');
    const body = encodeURIComponent(`Bug Report:\n\n${bugReportText}\n\nUser: ${user?.email || 'Guest'}\nPlatform: ${Platform.OS}`);
    Linking.openURL(`mailto:support@anistream.app?subject=${subject}&body=${body}`);
    setBugReportText('');
    setShowBugReport(false);
  };

  // Account management handlers
  const handleChangeEmail = async () => {
    if (!user || !newEmail.trim()) {
      setError('Please enter a new email address');
      return;
    }
    if (newEmail === user.email) {
      setError('New email must be different from current email');
      return;
    }
    if (!currentPassword) {
      setError('Please enter your current password to verify');
      return;
    }

    setUpdatingAccount(true);
    setError('');
    try {
      // Verify reCAPTCHA if enabled
      if (isRecaptchaEnabled() && Platform.OS === 'web') {
        try {
          const token = await executeRecaptcha(RECAPTCHA_SITE_KEY, 'change_email');
          const isValid = await verifyRecaptchaToken(token);
          if (!isValid) {
            throw new Error('reCAPTCHA verification failed');
          }
        } catch (recaptchaError) {
          console.warn('reCAPTCHA verification failed:', recaptchaError);
        }
      }

      // Reauthenticate first
      await reauthenticate(user.email || '', currentPassword);
      // Update email
      await updateEmail(newEmail);
      setSuccess('Email updated successfully!');
      setNewEmail('');
      setCurrentPassword('');
      setShowChangeEmail(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update email');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!currentPassword) {
      setError('Please enter your current password to verify');
      return;
    }

    setUpdatingAccount(true);
    setError('');
    try {
      // Verify reCAPTCHA if enabled
      if (isRecaptchaEnabled() && Platform.OS === 'web') {
        try {
          const token = await executeRecaptcha(RECAPTCHA_SITE_KEY, 'change_password');
          const isValid = await verifyRecaptchaToken(token);
          if (!isValid) {
            throw new Error('reCAPTCHA verification failed');
          }
        } catch (recaptchaError) {
          console.warn('reCAPTCHA verification failed:', recaptchaError);
        }
      }

      // Reauthenticate first
      await reauthenticate(user?.email || '', currentPassword);
      // Update password
      await updatePassword(newPassword);
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newSetPassword || !confirmSetPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newSetPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newSetPassword !== confirmSetPassword) {
      setError('Passwords do not match');
      return;
    }

    setUpdatingAccount(true);
    setError('');
    try {
      await setPassword(newSetPassword);
      setSuccess('Password set successfully! You can now sign in with email and password.');
      setNewSetPassword('');
      setConfirmSetPassword('');
      setShowSetPassword(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to set password');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSelectedPhotoFile(file);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please drop an image file');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSelectedPhotoFile(file);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
  };

  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setSelectedPhotoFile(null);
    setPhotoPreview(null);
    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value = '';
    }
  };

  const handleUpdateProfile = async () => {
    if (!newDisplayName.trim() && !selectedPhotoFile) {
      setError('Please enter a display name or upload a photo');
      return;
    }

    setUpdatingAccount(true);
    setError('');
    try {
      let photoUrlToUse: string | undefined = undefined;

      // Upload photo file if selected
      if (selectedPhotoFile && user) {
        photoUrlToUse = await uploadProfilePhoto(selectedPhotoFile, user.uid);
      }

      await updateProfile(
        newDisplayName.trim() || undefined,
        photoUrlToUse
      );
      setSuccess('Profile updated successfully!');
      setNewDisplayName('');
      handleRemovePhoto(); // Clean up preview
      setShowUpdateProfile(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentPassword) {
      setError('Please enter your password to confirm account deletion');
      return;
    }

    setUpdatingAccount(true);
    setError('');
    try {
      // Verify reCAPTCHA if enabled
      if (isRecaptchaEnabled() && Platform.OS === 'web') {
        try {
          const token = await executeRecaptcha(RECAPTCHA_SITE_KEY, 'delete_account');
          const isValid = await verifyRecaptchaToken(token);
          if (!isValid) {
            throw new Error('reCAPTCHA verification failed');
          }
        } catch (recaptchaError) {
          console.warn('reCAPTCHA verification failed:', recaptchaError);
        }
      }

      // Reauthenticate first
      await reauthenticate(user?.email || '', currentPassword);
      // Delete account
      await deleteAccount();
      setSuccess('Account deleted successfully');
      // User will be signed out automatically
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUpdatingAccount(false);
    }
  };

  const renderSavedAnimeItem = ({ item }: { item: SavedAnime }) => (
    <View style={styles.savedAnimeWrapper}>
      <TouchableOpacity
        style={styles.savedAnimeCard}
        onPress={() => handleAnimePress(item)}
      >
        <Image source={{ uri: getProxiedImageUrl(item.poster) || '' }} style={styles.savedAnimePoster} />
        <View style={styles.savedAnimeInfo}>
          <Text style={styles.savedAnimeTitle} numberOfLines={2}>{item.name}</Text>
          {item.type && <Text style={styles.savedAnimeType}>{item.type}</Text>}
          <View style={styles.savedAnimeActions}>
            <TouchableOpacity
              style={styles.statusBadge}
              onPress={(e) => {
                e.stopPropagation();
                setShowStatusPicker(showStatusPicker === item.id ? null : item.id);
              }}
            >
              <Ionicons name={COLLECTION_ICONS[item.status]} size={12} color="#e50914" />
              <Text style={styles.statusBadgeText}>{COLLECTION_LABELS[item.status]}</Text>
              <Ionicons name="chevron-down" size={12} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notifyButton}
              onPress={(e) => {
                e.stopPropagation();
                handleToggleNotifications(item.id, !item.notifyOnUpdate);
              }}
            >
              <Ionicons
                name={item.notifyOnUpdate ? 'notifications' : 'notifications-off'}
                size={16}
                color={item.notifyOnUpdate ? '#e50914' : '#666'}
              />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={(e) => {
            e.stopPropagation();
            handleRemoveSaved(item.id);
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#e50914" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Status Picker Dropdown */}
      {showStatusPicker === item.id && (
        <View style={styles.statusPicker}>
          {(Object.keys(COLLECTION_LABELS) as CollectionStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                item.status === status && styles.statusOptionActive,
              ]}
              onPress={() => handleStatusChange(item.id, status)}
            >
              <Ionicons
                name={COLLECTION_ICONS[status]}
                size={16}
                color={item.status === status ? '#e50914' : '#888'}
              />
              <Text
                style={[
                  styles.statusOptionText,
                  item.status === status && styles.statusOptionTextActive,
                ]}
              >
                {COLLECTION_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // FAQ Modal
  const FAQModal = () => (
    <Modal visible={showFAQ} animationType="slide" transparent statusBarTranslucent hardwareAccelerated>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>FAQ</Text>
            <TouchableOpacity onPress={() => setShowFAQ(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>What is AniStream?</Text>
              <Text style={styles.faqAnswer}>
                AniStream is an educational application developed to demonstrate web and mobile 
                application development concepts. It showcases user authentication, data management, 
                API integration, and third-party service implementation. This app is provided 
                solely for educational purposes.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Is AniStream free to use?</Text>
              <Text style={styles.faqAnswer}>
                Yes, AniStream is completely free to use. As an educational project, there are no 
                subscriptions, fees, or premium features. The application is provided "as is" 
                for educational demonstration purposes.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>What data does AniStream collect?</Text>
              <Text style={styles.faqAnswer}>
                AniStream collects minimal data necessary for basic functionality. We only receive 
                basic information through Google Authentication (name, email, profile picture). 
                We do not collect, track, or store any additional personal data beyond what is 
                required for authentication. For more details, please review our Privacy Policy.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Does AniStream use third-party services?</Text>
              <Text style={styles.faqAnswer}>
                Yes, AniStream relies on various third-party services to function, including 
                Google (Firebase) for authentication, content delivery networks for streaming, 
                and storage providers for file management. These services have their own privacy 
                policies and terms of service that apply to your use.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I save anime to my list?</Text>
              <Text style={styles.faqAnswer}>
                To save anime to your list, navigate to any anime detail page and tap the bookmark 
                icon. You can organize your saved anime into different collections: Watching, 
                Plan to Watch, Completed, On Hold, or Dropped. You can also enable notifications 
                to be alerted when new episodes are released.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Why isn't a video playing?</Text>
              <Text style={styles.faqAnswer}>
                If a video isn't playing, try the following: (1) Switch to a different streaming 
                server, (2) Select a different video quality option, (3) Check your internet 
                connection, (4) Refresh the page. Some sources may be temporarily unavailable 
                as this app relies on third-party content delivery services.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I change my account settings?</Text>
              <Text style={styles.faqAnswer}>
                Navigate to the Profile tab and select the Settings section. From there, you can 
                manage notifications, update your profile information, change your email or password, 
                and adjust playback preferences. You can also delete your account if needed.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I report issues or bugs?</Text>
              <Text style={styles.faqAnswer}>
                Use the "Report a Bug" option in the Settings section. Please provide as much 
                detail as possible about the issue, including what you were trying to do, what 
                happened, and any error messages you encountered. This helps us improve the 
                educational demonstration.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Is my data secure?</Text>
              <Text style={styles.faqAnswer}>
                While this is an educational application, we implement reasonable security measures 
                to protect your information. However, please be aware that no method of transmission 
                over the internet is 100% secure. We only collect minimal data through Google 
                Authentication and do not sell or share your data with third parties.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Can I use AniStream on mobile devices?</Text>
              <Text style={styles.faqAnswer}>
                Yes, AniStream is built with React Native and supports both web and mobile platforms. 
                The app is designed to work on iOS, Android, and web browsers. Some features may 
                vary between platforms due to platform-specific capabilities.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>What should I do if I have privacy concerns?</Text>
              <Text style={styles.faqAnswer}>
                If you have any privacy concerns, please review our Privacy Policy in the Settings 
                section. You can also delete your account at any time through the Account settings, 
                which will remove all your associated data. For additional questions, use the 
                Bug Report feature to contact us.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );


  // Bug Report Modal - rendered inline to prevent TextInput issues

  // Change Email Modal - rendered inline to prevent TextInput issues

  // Change Password Modal
  const ChangePasswordModal = () => (
    <Modal visible={showChangePassword} animationType="slide" transparent statusBarTranslucent hardwareAccelerated onRequestClose={() => setShowChangePassword(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setShowChangePassword(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter current password"
              placeholderTextColor="#666"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new password (min 6 characters)"
              placeholderTextColor="#666"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm new password"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}
            <TouchableOpacity
              style={[styles.modalButton, updatingAccount && styles.modalButtonDisabled]}
              onPress={handleChangePassword}
              disabled={updatingAccount}
            >
              {updatingAccount ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Set Password Modal (for users who signed in with Google)
  const SetPasswordModal = () => (
    <Modal visible={showSetPassword} animationType="slide" transparent statusBarTranslucent hardwareAccelerated onRequestClose={() => setShowSetPassword(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Password</Text>
            <TouchableOpacity onPress={() => setShowSetPassword(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.setPasswordInfo}>
              Add a password to your account so you can sign in with email and password in addition to Google.
            </Text>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter password (min 6 characters)"
              placeholderTextColor="#666"
              value={newSetPassword}
              onChangeText={setNewSetPassword}
              secureTextEntry
            />
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm password"
              placeholderTextColor="#666"
              value={confirmSetPassword}
              onChangeText={setConfirmSetPassword}
              secureTextEntry
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}
            <TouchableOpacity
              style={[styles.modalButton, updatingAccount && styles.modalButtonDisabled]}
              onPress={handleSetPassword}
              disabled={updatingAccount}
            >
              {updatingAccount ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Set Password</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowSetPassword(false)}
              disabled={updatingAccount}
            >
              <Text style={styles.modalCancelButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Update Profile Modal
  const UpdateProfileModal = () => (
    <Modal visible={showUpdateProfile} animationType="slide" transparent statusBarTranslucent hardwareAccelerated onRequestClose={() => {
      handleRemovePhoto();
      setShowUpdateProfile(false);
    }}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Profile</Text>
            <TouchableOpacity onPress={() => {
              handleRemovePhoto();
              setShowUpdateProfile(false);
            }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter display name"
              placeholderTextColor="#666"
              value={newDisplayName}
              onChangeText={setNewDisplayName}
            />
            
            <Text style={styles.inputLabel}>Profile Photo</Text>
            
            {/* Drag and Drop Area */}
            {Platform.OS === 'web' && (
              <View
                style={[
                  styles.dragDropArea,
                  isDragging && styles.dragDropAreaActive,
                  photoPreview && styles.dragDropAreaHasPhoto,
                ]}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {photoPreview ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image
                      source={{ uri: photoPreview }}
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={handleRemovePhoto}
                    >
                      <Ionicons name="close-circle" size={24} color="#e50914" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.changePhotoButton}
                      onPress={() => profilePhotoInputRef.current?.click()}
                    >
                      <Ionicons name="camera-outline" size={18} color="#fff" />
                      <Text style={styles.changePhotoButtonText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.dragDropContent}>
                    <Ionicons 
                      name={isDragging ? "cloud-upload" : "cloud-upload-outline"} 
                      size={48} 
                      color={isDragging ? "#e50914" : "#666"} 
                    />
                    <Text style={[styles.dragDropText, isDragging && styles.dragDropTextActive]}>
                      {isDragging ? 'Drop photo here' : 'Drag & drop photo here'}
                    </Text>
                    <Text style={styles.dragDropSubtext}>or</Text>
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={() => profilePhotoInputRef.current?.click()}
                    >
                      <Ionicons name="camera-outline" size={20} color="#fff" />
                      <Text style={styles.uploadButtonText}>Browse Files</Text>
                    </TouchableOpacity>
                    <Text style={styles.dragDropHint}>Max 5MB • JPG, PNG, GIF</Text>
                  </View>
                )}
                {Platform.OS === 'web' && (
                  <input
                    ref={profilePhotoInputRef as any}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoSelect}
                  />
                )}
              </View>
            )}

            {/* Current Photo (if no new photo selected) */}
            {!photoPreview && user?.photoURL && (
              <View style={styles.currentPhotoContainer}>
                <Text style={styles.currentPhotoLabel}>Current Photo:</Text>
                <Image
                  source={{ uri: user.photoURL }}
                  style={styles.currentPhoto}
                  resizeMode="cover"
                />
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}
            <TouchableOpacity
              style={[styles.modalButton, updatingAccount && styles.modalButtonDisabled]}
              onPress={handleUpdateProfile}
              disabled={updatingAccount}
            >
              {updatingAccount ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Update Profile</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Delete Account Modal
  const DeleteAccountModal = () => (
    <Modal visible={showDeleteAccount} animationType="slide" transparent statusBarTranslucent hardwareAccelerated onRequestClose={() => setShowDeleteAccount(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: '#e50914' }]}>Delete Account</Text>
            <TouchableOpacity onPress={() => setShowDeleteAccount(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.warningText}>
              ⚠️ Warning: This action cannot be undone. All your data, saved anime, and posts will be permanently deleted.
            </Text>
            <Text style={styles.inputLabel}>Enter your password to confirm</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your password"
              placeholderTextColor="#666"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton, updatingAccount && styles.modalButtonDisabled]}
              onPress={handleDeleteAccount}
              disabled={updatingAccount || !currentPassword}
            >
              {updatingAccount ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Delete Account Permanently</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowDeleteAccount(false)}
              disabled={updatingAccount}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Notifications Modal
  const NotificationsModal = () => {
    const getNotificationIcon = (type: string) => {
      switch (type) {
        case 'post_anime_interest':
          return 'chatbubble-outline';
        case 'comment_on_post':
        case 'comment_on_commented_post':
          return 'chatbubbles-outline';
        case 'anime_new_episode':
        case 'anime_new_season':
          return 'play-circle-outline';
        default:
          return 'notifications-outline';
      }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
      <Modal visible={showNotifications} animationType="slide" transparent statusBarTranslucent hardwareAccelerated onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.modalHeaderActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllReadButton}>
                    <Text style={styles.markAllReadText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.notificationsList}>
              {loadingNotifications ? (
                <View style={styles.notificationsEmpty}>
                  <ActivityIndicator size="large" color="#e50914" />
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.notificationsEmpty}>
                  <Ionicons name="notifications-off-outline" size={48} color="#444" />
                  <Text style={styles.notificationsEmptyText}>No notifications</Text>
                  <Text style={styles.notificationsEmptySubtext}>You're all caught up!</Text>
                </View>
              ) : (
                notifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.notificationItemUnread,
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                  >
                    <View style={styles.notificationIconContainer}>
                      <Ionicons
                        name={getNotificationIcon(notification.type) as any}
                        size={24}
                        color={!notification.read ? '#e50914' : '#888'}
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={[
                        styles.notificationTitle,
                        !notification.read && styles.notificationTitleUnread,
                      ]}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationBody}>{notification.body}</Text>
                      <Text style={styles.notificationTime}>
                        {userNotificationService.formatTimeAgo(notification.createdAt)}
                      </Text>
                    </View>
                    {!notification.read && <View style={styles.notificationDot} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      </SafeAreaView>
    );
  }

  // Logged in view
  if (user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* FAQ Modal */}
        <FAQModal />

        {/* Bug Report Modal - Inline to prevent TextInput glitches */}
        <Modal visible={showBugReport} animationType="slide" transparent statusBarTranslucent hardwareAccelerated onRequestClose={() => setShowBugReport(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report a Bug</Text>
                <TouchableOpacity onPress={() => setShowBugReport(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.bugReportLabel}>Describe the issue:</Text>
                <TextInput
                  key="bug-report-input"
                  style={styles.bugReportInput}
                  multiline
                  numberOfLines={6}
                  placeholder="Please describe the bug in detail..."
                  placeholderTextColor="#666"
                  value={bugReportText}
                  onChangeText={setBugReportText}
                />
                <TouchableOpacity style={styles.submitBugButton} onPress={handleBugReport}>
                  <Text style={styles.submitBugButtonText}>Send Report</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Change Email Modal - Inline to prevent TextInput glitches */}
        <Modal visible={showChangeEmail} animationType="slide" transparent statusBarTranslucent hardwareAccelerated onRequestClose={() => setShowChangeEmail(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Email</Text>
                <TouchableOpacity onPress={() => setShowChangeEmail(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Current Email</Text>
                <Text style={styles.currentValueText}>{user?.email || 'No email'}</Text>
                <Text style={styles.inputLabel}>New Email</Text>
                <TextInput
                  key="new-email-input"
                  style={styles.modalInput}
                  placeholder="Enter new email"
                  placeholderTextColor="#666"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  key="email-password-input"
                  style={styles.modalInput}
                  placeholder="Enter your password to verify"
                  placeholderTextColor="#666"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {success ? <Text style={styles.successText}>{success}</Text> : null}
                <TouchableOpacity
                  style={[styles.modalButton, updatingAccount && styles.modalButtonDisabled]}
                  onPress={handleChangeEmail}
                  disabled={updatingAccount}
                >
                  {updatingAccount ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Update Email</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ChangePasswordModal />
        <SetPasswordModal />
        <UpdateProfileModal />
        <DeleteAccountModal />

        <ScrollView>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.profileHeaderTop}>
              <View style={styles.avatarContainer}>
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <Ionicons name="person-circle" size={80} color="#e50914" />
                )}
              </View>
              <NotificationBell onPress={() => setShowNotifications(true)} />
            </View>
            <Text style={styles.userName}>{user.displayName || 'User'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabButton, profileTab === 'saved' && styles.tabButtonActive]}
              onPress={() => setProfileTab('saved')}
            >
              <Ionicons name="bookmark" size={18} color={profileTab === 'saved' ? '#e50914' : '#888'} />
              <Text style={[styles.tabButtonText, profileTab === 'saved' && styles.tabButtonTextActive]}>
                Saved
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, profileTab === 'settings' && styles.tabButtonActive]}
              onPress={() => setProfileTab('settings')}
            >
              <Ionicons name="settings" size={18} color={profileTab === 'settings' ? '#e50914' : '#888'} />
              <Text style={[styles.tabButtonText, profileTab === 'settings' && styles.tabButtonTextActive]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>

          {/* Saved Anime Tab */}
          {profileTab === 'saved' && (
            <View style={styles.tabContent}>
              {/* Collection Status Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.collectionTabs}
                contentContainerStyle={styles.collectionTabsContent}
              >
                {(Object.keys(COLLECTION_LABELS) as CollectionStatus[]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.collectionTab,
                      collectionTab === status && styles.collectionTabActive,
                    ]}
                    onPress={() => setCollectionTab(status)}
                  >
                    <Ionicons
                      name={COLLECTION_ICONS[status]}
                      size={16}
                      color={collectionTab === status ? '#e50914' : '#888'}
                    />
                    <Text
                      style={[
                        styles.collectionTabText,
                        collectionTab === status && styles.collectionTabTextActive,
                      ]}
                    >
                      {COLLECTION_LABELS[status]}
                    </Text>
                    {collectionCounts[status] > 0 && (
                      <View style={[
                        styles.collectionCount,
                        collectionTab === status && styles.collectionCountActive,
                      ]}>
                        <Text style={[
                          styles.collectionCountText,
                          collectionTab === status && styles.collectionCountTextActive,
                        ]}>
                          {collectionCounts[status]}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {loadingSaved ? (
                <ActivityIndicator size="small" color="#e50914" style={{ marginTop: 20 }} />
              ) : filteredAnime.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name={COLLECTION_ICONS[collectionTab]} size={48} color="#444" />
                  <Text style={styles.emptyStateText}>No {COLLECTION_LABELS[collectionTab].toLowerCase()} anime</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Add anime from the detail page to track your progress
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredAnime}
                  renderItem={renderSavedAnimeItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}

          {/* Settings Tab */}
          {profileTab === 'settings' && (
            <View style={styles.tabContent}>
              {/* Notifications */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Notifications</Text>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="notifications-outline" size={22} color="#fff" />
                    <View>
                      <Text style={styles.settingText}>Anime Updates</Text>
                      <Text style={styles.settingSubtext}>Get notified when new episodes are released</Text>
                    </View>
                  </View>
                  {registeringNotifications ? (
                    <ActivityIndicator size="small" color="#e50914" />
                  ) : (
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={handleNotificationToggle}
                      trackColor={{ false: '#333', true: '#e50914' }}
                      thumbColor="#fff"
                    />
                  )}
                </View>
              </View>

              {/* Playback */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Playback</Text>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="play-circle-outline" size={22} color="#fff" />
                    <Text style={styles.settingText}>Auto-play Next Episode</Text>
                  </View>
                  <Switch
                    value={autoPlayEnabled}
                    onValueChange={async (value) => {
                      setAutoPlayEnabled(value);
                      if (user) {
                        try {
                          await userSettingsService.setAutoPlayEnabled(user.uid, value);
                        } catch (err) {
                          console.error('Failed to save autoplay setting:', err);
                        }
                      }
                    }}
                    trackColor={{ false: '#333', true: '#e50914' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              {/* Account Management */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Account</Text>
                <TouchableOpacity style={styles.settingRowButton} onPress={() => {
                  setNewEmail('');
                  setCurrentPassword('');
                  setShowChangeEmail(true);
                }}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="mail-outline" size={22} color="#fff" />
                    <View>
                      <Text style={styles.settingText}>Change Email</Text>
                      <Text style={styles.settingSubtext}>{user?.email || 'No email set'}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
                {user?.hasPassword ? (
                  <TouchableOpacity style={styles.settingRowButton} onPress={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowChangePassword(true);
                  }}>
                    <View style={styles.settingInfo}>
                      <Ionicons name="lock-closed-outline" size={22} color="#fff" />
                      <Text style={styles.settingText}>Change Password</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.settingRowButton} onPress={() => {
                    setNewSetPassword('');
                    setConfirmSetPassword('');
                    setError('');
                    setShowSetPassword(true);
                  }}>
                    <View style={styles.settingInfo}>
                      <Ionicons name="lock-open-outline" size={22} color="#e50914" />
                      <View>
                        <Text style={[styles.settingText, { color: '#e50914' }]}>Set Password</Text>
                        <Text style={styles.settingSubtext}>Enable email/password sign in</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.settingRowButton} onPress={() => {
                  setNewDisplayName(user?.displayName || '');
                  setSelectedPhotoFile(null);
                  setPhotoPreview(null);
                  setIsDragging(false);
                  setShowUpdateProfile(true);
                }}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="person-outline" size={22} color="#fff" />
                    <View>
                      <Text style={styles.settingText}>Update Profile</Text>
                      <Text style={styles.settingSubtext}>Name: {user?.displayName || 'Not set'}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRowButton} onPress={() => {
                  setCurrentPassword('');
                  setShowDeleteAccount(true);
                }}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="trash-outline" size={22} color="#e50914" />
                    <Text style={[styles.settingText, { color: '#e50914' }]}>Delete Account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Support */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Support</Text>
                <TouchableOpacity style={styles.settingRowButton} onPress={() => setShowFAQ(true)}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="help-circle-outline" size={22} color="#fff" />
                    <Text style={styles.settingText}>FAQ</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRowButton} onPress={() => router.push('/policy')}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="document-text-outline" size={22} color="#fff" />
                    <Text style={styles.settingText}>Privacy Policy</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRowButton} onPress={() => router.push('/terms')}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="document-text-outline" size={22} color="#fff" />
                    <Text style={styles.settingText}>Terms of Service</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRowButton} onPress={() => setShowBugReport(true)}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="bug-outline" size={22} color="#fff" />
                    <Text style={styles.settingText}>Report a Bug</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Sign Out */}
              <TouchableOpacity style={styles.signOutButtonFull} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={22} color="#e50914" />
                <Text style={styles.signOutTextFull}>Sign Out</Text>
              </TouchableOpacity>

              <Text style={styles.versionText}>AniStream v2.0.4</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Login/Signup form (shown when user is not logged in)
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FAQModal />

      {/* Bug Report Modal - Inline to prevent TextInput glitches */}
      <Modal visible={showBugReport} animationType="slide" transparent statusBarTranslucent hardwareAccelerated onRequestClose={() => setShowBugReport(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report a Bug</Text>
              <TouchableOpacity onPress={() => setShowBugReport(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.bugReportLabel}>Describe the issue:</Text>
              <TextInput
                key="bug-report-input-login"
                style={styles.bugReportInput}
                multiline
                numberOfLines={6}
                placeholder="Please describe the bug in detail..."
                placeholderTextColor="#666"
                value={bugReportText}
                onChangeText={setBugReportText}
              />
              <TouchableOpacity style={styles.submitBugButton} onPress={handleBugReport}>
                <Text style={styles.submitBugButtonText}>Send Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {authMode === 'passwordless' ? 'Sign In' : authMode === 'login' ? 'Sign In' : 'Create Account'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#46d369" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {/* Auth Mode Tabs */}
          <View style={styles.tabsContainer}>
            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={[styles.tab, authMode === 'passwordless' && styles.tabActive]}
                onPress={() => { setAuthMode('passwordless'); setError(''); setSuccess(''); }}
              >
                <Ionicons name="mail" size={16} color={authMode === 'passwordless' ? '#e50914' : '#888'} />
                <Text style={[styles.tabText, authMode === 'passwordless' && styles.tabTextActive]}>
                  Email Link
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.tab, authMode === 'login' && styles.tabActive]}
              onPress={() => { setAuthMode('login'); setError(''); setSuccess(''); }}
            >
              <Ionicons name="key" size={16} color={authMode === 'login' ? '#e50914' : '#888'} />
              <Text style={[styles.tabText, authMode === 'login' && styles.tabTextActive]}>
                Password
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password Input (only for password auth) */}
          {(authMode === 'login' || authMode === 'signup') && (
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#666"
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry
              />
            </View>
          )}

          {/* Forgot Password Link - only show on login */}
          {authMode === 'login' && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
              disabled={submitting}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={authMode === 'passwordless' ? handlePasswordlessSubmit : handlePasswordSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {authMode === 'passwordless' ? 'Send Sign-In Link' : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {authMode === 'login' && (
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => { setAuthMode('signup'); setError(''); }}
            >
              <Text style={styles.switchText}>
                Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          )}

          {authMode === 'signup' && (
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => { setAuthMode('login'); setError(''); }}
            >
              <Text style={styles.switchText}>
                Already have an account? <Text style={styles.switchTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={submitting}
          >
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Support links for login page */}
        <View style={styles.loginSupport}>
          <TouchableOpacity onPress={() => setShowFAQ(true)}>
            <Text style={styles.loginSupportLink}>FAQ</Text>
          </TouchableOpacity>
          <Text style={styles.loginSupportDot}>•</Text>
          <TouchableOpacity onPress={() => router.push('/policy')}>
            <Text style={styles.loginSupportLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.loginSupportDot}>•</Text>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.loginSupportLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
        
        {/* Guest user info for mobile */}
        {Platform.OS !== 'web' && (
          <View style={styles.guestInfoSection}>
            <Ionicons name="information-circle-outline" size={20} color="#888" />
            <Text style={styles.guestInfoText}>
              Sign in to sync your watchlist across devices
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  profileHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
  },
  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#e50914',
  },
  tabButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // Collection Tabs
  collectionTabs: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  collectionTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  collectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    gap: 6,
  },
  collectionTabActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderWidth: 1,
    borderColor: '#e50914',
  },
  collectionTabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  collectionTabTextActive: {
    color: '#fff',
  },
  collectionCount: {
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  collectionCountActive: {
    backgroundColor: '#e50914',
  },
  collectionCountText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  collectionCountTextActive: {
    color: '#fff',
  },
  // Saved Anime
  savedAnimeWrapper: {
    marginBottom: 12,
  },
  savedAnimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  savedAnimePoster: {
    width: 60,
    height: 90,
    backgroundColor: '#333',
  },
  savedAnimeInfo: {
    flex: 1,
    padding: 12,
  },
  savedAnimeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  savedAnimeType: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  savedAnimeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  notifyButton: {
    padding: 4,
  },
  removeButton: {
    padding: 12,
  },
  // Status Picker
  statusPicker: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginTop: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    gap: 8,
  },
  statusOptionActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
  },
  statusOptionText: {
    color: '#888',
    fontSize: 13,
  },
  statusOptionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  // Settings
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  settingRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    color: '#fff',
    fontSize: 15,
  },
  settingSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  signOutButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  signOutTextFull: {
    color: '#e50914',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  // Guest Section
  guestSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  guestText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalScroll: {
    padding: 16,
  },
  modalBody: {
    padding: 16,
  },
  // FAQ
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  // Bug Report
  bugReportLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  bugReportInput: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    color: '#fff',
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitBugButton: {
    backgroundColor: '#e50914',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBugButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Form styles
  formContainer: {
    flex: 1,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#333',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#e50914',
  },
  errorContainer: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#e50914',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(70, 211, 105, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successText: {
    color: '#46d369',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
    paddingRight: 12,
  },
  submitButton: {
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 10,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#888',
    fontSize: 14,
  },
  switchTextBold: {
    color: '#e50914',
    fontWeight: '600',
  },
  loginSupport: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loginSupportLink: {
    color: '#888',
    fontSize: 13,
  },
  loginSupportDot: {
    color: '#444',
    fontSize: 13,
  },
  guestInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  guestInfoText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
  },
  // Account Management Modal Styles
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  currentValueText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
  },
  modalInput: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    color: '#fff',
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  modalButton: {
    backgroundColor: '#e50914',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#e50914',
  },
  modalCancelButton: {
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCancelButtonText: {
    color: '#888',
    fontSize: 14,
  },
  warningText: {
    color: '#e50914',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
  },
  // Photo Upload Styles
  photoPreviewContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 16,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e50914',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Drag and Drop Styles
  dragDropArea: {
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    marginVertical: 16,
    backgroundColor: '#0a0a0a',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragDropAreaActive: {
    borderColor: '#e50914',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  dragDropAreaHasPhoto: {
    borderStyle: 'solid',
    borderColor: '#333',
    padding: 16,
  },
  dragDropContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragDropText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8,
  },
  dragDropTextActive: {
    color: '#e50914',
  },
  dragDropSubtext: {
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
  },
  dragDropHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 12,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  changePhotoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  currentPhotoContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  currentPhotoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  currentPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
  },
  // Notification Styles
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unreadBadge: {
    backgroundColor: '#e50914',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  markAllReadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllReadText: {
    color: '#e50914',
    fontSize: 14,
    fontWeight: '500',
  },
  notificationsList: {
    flex: 1,
  },
  notificationsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  notificationsEmptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  notificationsEmptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0a0a0a',
  },
  notificationItemUnread: {
    backgroundColor: '#1a1a1a',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationTitleUnread: {
    color: '#fff',
    fontWeight: '600',
  },
  notificationBody: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  notificationTime: {
    color: '#666',
    fontSize: 11,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e50914',
    alignSelf: 'center',
  },
  setPasswordInfo: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.2)',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#e50914',
    fontSize: 14,
  },
});
