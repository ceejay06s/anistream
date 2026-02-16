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
    if (Platform.OS !== 'web' || !auth) {
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
    if (Platform.OS !== 'web' || !auth) {
      throw new Error('Auth not available on this platform');
    }
    const { signInWithEmailAndPassword } = require('firebase/auth');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    if (Platform.OS !== 'web' || !auth) {
      throw new Error('Auth not available on this platform');
    }
    const { createUserWithEmailAndPassword } = require('firebase/auth');
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    if (Platform.OS !== 'web' || !auth) {
      throw new Error('Auth not available on this platform');
    }
    const { signOut: firebaseSignOut } = require('firebase/auth');
    await firebaseSignOut(auth);
  };

  const signInWithGoogle = async () => {
    if (Platform.OS !== 'web' || !auth) {
      throw new Error('Auth not available on this platform');
    }
    const { signInWithPopup, GoogleAuthProvider } = require('firebase/auth');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const sendSignInLink = async (email: string) => {
    if (Platform.OS !== 'web' || !auth) {
      throw new Error('Auth not available on this platform');
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
    if (Platform.OS !== 'web' || !auth) {
      throw new Error('Auth not available on this platform');
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
    if (Platform.OS !== 'web' || !auth || !auth.currentUser) {
      throw new Error('Auth not available or user not signed in');
    }
    const { signInWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential } = require('firebase/auth');
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);
  };

  const updateEmail = async (newEmail: string) => {
    if (Platform.OS !== 'web' || !auth || !auth.currentUser) {
      throw new Error('Auth not available or user not signed in');
    }
    const { updateEmail: firebaseUpdateEmail } = require('firebase/auth');
    await firebaseUpdateEmail(auth.currentUser, newEmail);
  };

  const updatePassword = async (newPassword: string) => {
    if (Platform.OS !== 'web' || !auth || !auth.currentUser) {
      throw new Error('Auth not available or user not signed in');
    }
    const { updatePassword } = require('firebase/auth');
    await updatePassword(auth.currentUser, newPassword);
  };

  const updateProfile = async (displayName?: string, photoURL?: string) => {
    if (Platform.OS !== 'web' || !auth || !auth.currentUser) {
      throw new Error('Auth not available or user not signed in');
    }
    const { updateProfile: firebaseUpdateProfile } = require('firebase/auth');
    const updates: any = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;
    await firebaseUpdateProfile(auth.currentUser, updates);
  };

  const deleteAccount = async () => {
    if (Platform.OS !== 'web' || !auth || !auth.currentUser) {
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
