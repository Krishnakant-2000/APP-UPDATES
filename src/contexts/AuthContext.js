import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import notificationService from '../services/notificationService';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password, displayName) {
    return createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        return updateProfile(userCredential.user, { displayName });
      });
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function guestLogin() {
    return signInAnonymously(auth);
  }

  async function googleLogin() {
    const provider = new GoogleAuthProvider();
    
    try {
      // First try popup method
      return await signInWithPopup(auth, provider);
    } catch (error) {
      console.log('Google login error:', error.code, error.message);
      
      // If popup fails due to CORS, popup blocked, or other popup issues, fallback to redirect
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request' ||
          error.message?.includes('Cross-Origin-Opener-Policy') ||
          error.message?.includes('popup')) {
        console.log('Popup failed, falling back to redirect method...');
        return signInWithRedirect(auth, provider);
      }
      throw error;
    }
  }

  async function facebookLogin() {
    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    
    try {
      // First try popup method
      return await signInWithPopup(auth, provider);
    } catch (error) {
      console.log('Facebook login error:', error.code, error.message);
      
      // If popup fails, fallback to redirect
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request' ||
          error.message?.includes('Cross-Origin-Opener-Policy') ||
          error.message?.includes('popup')) {
        console.log('Facebook popup failed, falling back to redirect method...');
        return signInWithRedirect(auth, provider);
      }
      throw error;
    }
  }

  function appleLogin() {
    const provider = new OAuthProvider('apple.com');
    // Request additional scopes if needed
    provider.addScope('email');
    provider.addScope('name');
    return signInWithPopup(auth, provider);
  }

  function logout() {
    return signOut(auth).then(() => {
      // Clear remembered credentials on explicit logout
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberMe');

      // Redirect to login page with logout parameter
      window.location.href = '/login?logout=yes';
    });
  }

  async function updateUserProfile(profileData) {
    await updateProfile(currentUser, profileData);
    // Force refresh the current user to get updated profile
    await currentUser.reload();
    setCurrentUser({ ...currentUser });
    console.log('✅ Auth context refreshed with new profile data');
    return currentUser;
  }

  function refreshAuth() {
    if (currentUser) {
      currentUser.reload().then(() => {
        setCurrentUser({ ...currentUser });
        console.log('✅ Auth context manually refreshed');
      });
    }
  }

  useEffect(() => {
    // Handle redirect result from Google OAuth
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Google redirect login successful:', result.user);
          setCurrentUser(result.user);
        }
      })
      .catch((error) => {
        console.error('Redirect result error:', error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // Trigger theme refresh after auth state change to fix dark theme button visibility
      if (user) {
        setTimeout(() => {
          window.dispatchEvent(new Event('themeRefresh'));
        }, 100);
      }
      
      // Only initialize notifications if permission is already granted and user is on authenticated pages
      if (user && !user.isAnonymous && Notification.permission === 'granted') {
        // Check if we're on an authenticated page (not landing/login/signup)
        const currentPath = window.location.pathname;
        const isAuthenticatedPage = !['/','', '/landing', '/login', '/signup'].includes(currentPath);
        
        if (isAuthenticatedPage) {
          try {
            console.log('🔔 Initializing push notifications for user:', user.uid);
            await notificationService.initialize();
            await notificationService.getAndSaveToken(user.uid);
          } catch (error) {
            console.error('Error initializing notifications:', error);
          }
        } else {
          console.log('🔔 Skipping notification init on public page:', currentPath);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Helper function to check if current user is a guest
  function isGuest() {
    return currentUser && currentUser.isAnonymous;
  }

  const value = {
    currentUser,
    isGuest,
    signup,
    login,
    guestLogin,
    googleLogin,
    facebookLogin,
    appleLogin,
    logout,
    updateUserProfile,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}