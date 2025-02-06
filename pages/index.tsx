import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { getSubscription } from '../lib/stripe';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user) {
      getSubscription(user.uid).then(setSubscription);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Welcome to Our Service
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            {user ? 'Access your premium content here' : 'Sign up to get started'}
          </p>
        </div>

        <div className="mt-10">
          {!user && (
            <div className="space-x-4 text-center">
              <button
                onClick={() => router.push('/signin')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50"
              >
                Sign Up
              </button>
            </div>
          )}

          {user && !subscription && (
            <div className="text-center">
              <button
                onClick={() => router.push('/subscription')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Get Premium
              </button>
            </div>
          )}

          {user && subscription && (
            <div className="text-center">
              <p className="text-xl text-gray-700 mb-4">
                You have access to premium content!
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}