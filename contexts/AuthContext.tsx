import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  isAdmin?: boolean;
  isAdult: boolean;
  acceptedTerms: boolean;
  termsAcceptedAt: string;
  createdAt: string;
  updatedAt?: string;
}

interface SignupData {
  firstName: string;
  lastName: string;
  username: string;
  isAdult: boolean;
   emailUpdates: boolean; 
  acceptedTerms: boolean;
  termsAcceptedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, userData: SignupData) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  getUserProfile: (userId: string) => Promise<UserProfile | null>;
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

export function useProtectedRoute() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin');
    }
  }, [user, loading, router]);

  return { user, loading };
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? `User logged in: ${user.uid}` : 'No user');
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (
    email: string, 
    password: string, 
    userData: SignupData
  ): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;

      const displayName = `${userData.firstName} ${userData.lastName}`;
      await updateProfile(user, {
        displayName
      });

      const timestamp = new Date().toISOString();

      const userProfile: UserProfile = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: email,
        username: userData.username,
        isAdmin: false,
        isAdult: userData.isAdult,
        acceptedTerms: userData.acceptedTerms,
        termsAcceptedAt: userData.termsAcceptedAt,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);

      setUser(user);
      return user;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
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