import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { auth } from '@/config/firebase';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendSignInLink: (email: string) => Promise<void>;
  completeSignInWithLink: (email: string, link: string) => Promise<void>;
  isSignInWithEmailLink: (link: string) => boolean;
  updateEmail: (newEmail: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (displayName?: string, photoURL?: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  reauthenticate: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const { onAuthStateChanged } = require('firebase/auth');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: any) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Auth not available');
    }
    const { signInWithEmailAndPassword } = require('firebase/auth');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Auth not available');
    }
    const { createUserWithEmailAndPassword } = require('firebase/auth');
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    if (!auth) {
      throw new Error('Auth not available');
    }
    const { signOut: firebaseSignOut } = require('firebase/auth');
    await firebaseSignOut(auth);
  };

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Auth not available');
    }
    if (Platform.OS === 'web') {
      const { signInWithPopup, GoogleAuthProvider } = require('firebase/auth');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else {
      // Mobile: Use native Google Sign-In
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const { GoogleAuthProvider, signInWithCredential } = require('firebase/auth');

      // Configure Google Sign-In
      GoogleSignin.configure({
        webClientId: '797841167253-tl8v6hm1dg1lof6qmterms3hl077bb8g.apps.googleusercontent.com',
      });

      // Check if already signed in to Google
      const isSignedIn = await GoogleSignin.hasPreviousSignIn();
      if (isSignedIn) {
        await GoogleSignin.signOut();
      }

      // Perform sign in
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }

      // Sign in to Firebase with the Google credential
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    }
  };

  const sendSignInLink = async (email: string) => {
    if (!auth) {
      throw new Error('Auth not available');
    }
    if (Platform.OS !== 'web') {
      throw new Error('Email link sign-in is only available on web');
    }
    const { sendSignInLinkToEmail } = require('firebase/auth');
    const actionCodeSettings = {
      url: typeof window !== 'undefined' ? window.location.origin + '/profile' : 'https://anistream-pink.vercel.app/profile',
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Save email for later verification
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('emailForSignIn', email);
    }
  };

  const completeSignInWithLink = async (email: string, link: string) => {
    if (!auth) {
      throw new Error('Auth not available');
    }
    if (Platform.OS !== 'web') {
      throw new Error('Email link sign-in is only available on web');
    }
    const { signInWithEmailLink } = require('firebase/auth');
    await signInWithEmailLink(auth, email, link);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('emailForSignIn');
    }
  };

  const isSignInWithEmailLink = (link: string): boolean => {
    if (Platform.OS !== 'web' || !auth) {
      return false;
    }
    const { isSignInWithEmailLink: checkLink } = require('firebase/auth');
    return checkLink(auth, link);
  };

  const reauthenticate = async (email: string, password: string) => {
    if (!auth || !auth.currentUser) {
      throw new Error('Auth not available or user not signed in');
    }
    const { signInWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential } = require('firebase/auth');
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);
  };

  const updateEmail = async (newEmail: string) => {
    if (!auth || !auth.currentUser) {
      throw new Error('Auth not available or user not signed in');
    }
    const { updateEmail: firebaseUpdateEmail } = require('firebase/auth');
    await firebaseUpdateEmail(auth.currentUser, newEmail);
  };

  const updatePassword = async (newPassword: string) => {
    if (!auth || !auth.currentUser) {
      throw new Error('Auth not available or user not signed in');
    }
    const { updatePassword } = require('firebase/auth');
    await updatePassword(auth.currentUser, newPassword);
  };

  const updateProfile = async (displayName?: string, photoURL?: string) => {
    if (!auth || !auth.currentUser) {
      throw new Error('Auth not available or user not signed in');
    }
    const { updateProfile: firebaseUpdateProfile } = require('firebase/auth');
    const updates: any = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;
    await firebaseUpdateProfile(auth.currentUser, updates);
  };

  const deleteAccount = async () => {
    if (!auth || !auth.currentUser) {
      throw new Error('Auth not available or user not signed in');
    }
    const { deleteUser } = require('firebase/auth');
    await deleteUser(auth.currentUser);
  };

  return (
    <AuthContext.Provider value={{
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
