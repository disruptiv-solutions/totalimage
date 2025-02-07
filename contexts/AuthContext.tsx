// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, userData: { firstName: string; lastName: string }) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  getUserProfile: (userId: string) => Promise<UserProfile | null>;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signup: async () => { throw new Error('AuthContext not initialized') },
  login: async () => { throw new Error('AuthContext not initialized') },
  logout: async () => { throw new Error('AuthContext not initialized') },
  getUserProfile: async () => { throw new Error('AuthContext not initialized') },
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? `User logged in: ${user.uid}` : 'No user');
      setUser(user);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  const signup = async (
    email: string, 
    password: string, 
    userData: { firstName: string; lastName: string }
  ): Promise<User> => {
    try {
      console.log('Attempting signup...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Signup successful:', userCredential.user.uid);

      // Update the user's display name
      const displayName = `${userData.firstName} ${userData.lastName}`;
      await updateProfile(userCredential.user, {
        displayName: displayName
      });

      // Store additional user data in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: email,
        createdAt: new Date().toISOString()
      });

      setUser(userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      console.log('Attempting login...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', userCredential.user.uid);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Attempting logout...');
      await signOut(auth);
      console.log('Logout successful');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    getUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}