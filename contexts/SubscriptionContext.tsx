// contexts/SubscriptionContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface SubscriptionData {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  priceId: string;
  currentPeriodStart: any; // Firestore Timestamp
  currentPeriodEnd: any; // Firestore Timestamp
  startDate?: any; // Firestore Timestamp
  cancelAtPeriodEnd: boolean;
  cancelAt?: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  hasAccess: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: true,
  hasAccess: false,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    // Subscribe to the active subscription
    // Note: Using 'subscriptions' (plural) to match the API endpoint structure
    const subscriptionRef = collection(db, 'users', user.uid, 'subscriptions');
    const q = query(
      subscriptionRef,
      where('status', 'in', ['active', 'trialing'])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Get the most recent subscription if multiple exist
        const subscriptionDoc = snapshot.docs[0];
        if (subscriptionDoc) {
          setSubscription(subscriptionDoc.data() as SubscriptionData);
        } else {
          setSubscription(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Check if user has access based on subscription status
  const hasAccess = subscription?.status === 'active' || 
                    subscription?.status === 'trialing';

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, hasAccess }}>
      {children}
    </SubscriptionContext.Provider>
  );
}