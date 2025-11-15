import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  AuthError 
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;

  const checkAdminStatus = async (user: User | null) => {
    if (user && adminEmail && user.email === adminEmail) {
      // For the specific admin email, always allow access
      setIsAdmin(true);
    } else if (user) {
      // For other users, check the admin collection in Firestore
      try {
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          setIsAdmin(adminData.active === true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      // Check if using mock authentication for development
      const useMockAuth = process.env.REACT_APP_USE_MOCK_AUTH === 'true';
      const mockAdminEmail = process.env.REACT_APP_ADMIN_EMAIL;
      const mockAdminPassword = process.env.REACT_APP_ADMIN_PASSWORD;

      console.log('Login attempt:', {
        email,
        useMockAuth,
        mockAdminEmail,
        mockAdminPassword,
        envVars: process.env
      });

      if (useMockAuth && mockAdminEmail && mockAdminPassword) {
        // Mock authentication mode
        console.log('Checking mock auth:', { email, mockAdminEmail, password, mockAdminPassword });
        if (email === mockAdminEmail && password === mockAdminPassword) {
          // Create a mock user object
          const mockUser = {
            email: mockAdminEmail,
            uid: 'mock-admin-user',
            displayName: 'Admin User',
          } as any;

          setCurrentUser(mockUser);
          setIsAdmin(true);
          console.log('Admin logged in successfully (mock mode)');
          return;
        } else {
          throw new Error('Invalid email or password');
        }
      }

      // Real Firebase authentication
      if (!auth) {
        throw new Error('Firebase Authentication not available. Please configure Firebase credentials.');
      }
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Check if user is admin
      if (adminEmail && userCredential.user.email !== adminEmail) {
        await signOut(auth);
        throw new Error('Access denied. Admin privileges required.');
      }

      console.log('Admin logged in successfully');
    } catch (error) {
      const authError = error as any;
      console.error('Login error:', authError.message);
      throw new Error(authError.message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Check if using mock authentication
      const useMockAuth = process.env.REACT_APP_USE_MOCK_AUTH === 'true';

      if (useMockAuth) {
        // Clear mock user
        setCurrentUser(null);
        setIsAdmin(false);
        console.log('Admin logged out successfully (mock mode)');
        return;
      }

      if (!auth) {
        console.warn('Firebase Authentication not available');
        return;
      }
      await signOut(auth);
      console.log('Admin logged out successfully');
    } catch (error) {
      const authError = error as AuthError;
      console.error('Logout error:', authError.message);
      throw new Error(authError.message);
    }
  };

  useEffect(() => {
    // If auth is not available, set loading to false and allow access for development
    if (!auth) {
      console.warn('Firebase Auth not initialized - running in development mode');
      setLoading(false);
      // For development, allow access without authentication
      setIsAdmin(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await checkAdminStatus(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [adminEmail]);

  const value: AuthContextType = {
    currentUser,
    login,
    logout,
    loading,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};