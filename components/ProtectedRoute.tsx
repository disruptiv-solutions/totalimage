

// components/ProtectedRoute.tsx
import { useEffect, useMemo } from 'react';
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

  const hasRecentCheckoutSuccess = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const raw = window.sessionStorage.getItem('checkout_success_ts');
    const ts = raw ? Number(raw) : 0;
    if (!ts || Number.isNaN(ts)) return false;
    return Date.now() - ts < 60_000;
  }, [router.asPath]);

  const isCheckoutSuccessBypass =
    router.pathname === '/' && (router.query.success === 'true' || hasRecentCheckoutSuccess);

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

      if (requireSubscription && !hasActiveSubscription && !isAdmin && !isCheckoutSuccessBypass) {
        router.push('/checkout?period=monthly');
        return;
      }

      if (hasActiveSubscription && typeof window !== 'undefined') {
        window.sessionStorage.removeItem('checkout_success_ts');
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
    fallbackPath,
    isCheckoutSuccessBypass
  ]);

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Allow access for admins or users with valid subscriptions
  if (!user || (!isAdmin && requireSubscription && !hasActiveSubscription && !isCheckoutSuccessBypass)) {
    return null;
  }

  return <>{children}</>;
}