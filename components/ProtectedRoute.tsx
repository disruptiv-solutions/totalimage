//components/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  fallbackPath = '/signin' 
}: ProtectedRouteProps) {
  const { user, loading, getUserProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function checkAccess() {
      if (!loading) {
        if (!user) {
          router.push(fallbackPath);
          return;
        }

        if (requireAdmin) {
          const profile = await getUserProfile(user.uid);
          if (!profile?.isAdmin) {
            router.push('/');
          }
        }
      }
    }

    checkAccess();
  }, [user, loading, router, requireAdmin, fallbackPath, getUserProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}