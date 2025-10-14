

// components/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSubscription?: boolean;
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireSubscription = true,
  fallbackPath = '/signin' 
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasActiveSubscription, isAdmin, loading: subscriptionLoading } = useSubscriptionStatus();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !subscriptionLoading) {
      if (!user) {
        router.push(fallbackPath);
        return;
      }

      if (requireAdmin && !isAdmin) {
        router.push('/');
        return;
      }

      if (requireSubscription && !hasActiveSubscription && !isAdmin) {
        router.push('/subscription');
        return;
      }
    }
  }, [
    user, 
    authLoading, 
    subscriptionLoading, 
    hasActiveSubscription, 
    isAdmin, 
    router, 
    requireAdmin, 
    requireSubscription, 
    fallbackPath
  ]);

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Allow access for admins or users with valid subscriptions
  if (!user || (!isAdmin && requireSubscription && !hasActiveSubscription)) {
    return null;
  }

  return <>{children}</>;
}