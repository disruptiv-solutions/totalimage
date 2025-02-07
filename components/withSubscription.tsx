// components/withSubscription.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

export function withSubscription<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithSubscriptionComponent(props: P) {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { hasAccess, loading: subscriptionLoading } = useSubscription();

    useEffect(() => {
      if (!authLoading && !subscriptionLoading) {
        if (!user) {
          router.replace('/signin');
        } else if (!hasAccess) {
          router.replace('/subscription');
        }
      }
    }, [user, hasAccess, authLoading, subscriptionLoading]);

    // Show nothing while checking auth and subscription
    if (authLoading || subscriptionLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    // Show nothing while redirecting
    if (!user || !hasAccess) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}