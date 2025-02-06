import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { getSubscription } from '../lib/stripe';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/signin');
      return;
    }

    const fetchSubscription = async () => {
      try {
        const sub = await getSubscription(user.uid);
        setSubscription(sub);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
        }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-indigo-600">Dashboard</span>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Subscription Status Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Subscription Details
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {subscription ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </dd>
              </div>
              {subscription && (
                <>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Plan</dt>
                    <dd className="mt-1 text-sm text-gray-900">{subscription.plan}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Billing Period</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {subscription.interval}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {subscription ? (
              <button
                onClick={handleManageSubscription}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Manage Subscription
              </button>
            ) : (
              <button
                onClick={() => router.push('/subscription')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Get Subscription
              </button>
            )}
          </div>
        </div>

        {/* Premium Content Section */}
        {subscription && (
          <div className="mt-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Premium Content
                </h3>
                <div className="prose max-w-none">
                  <p>
                    Welcome to your premium dashboard! Here you can access all your
                    premium features and content.
                  </p>
                  {/* Add your premium content here */}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}