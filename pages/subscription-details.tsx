// subscription-details.tsx
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

export default function SubscriptionDetails() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    router.replace('/signin');
    return null;
  }

  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      trialing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
      canceled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Canceled' },
      incomplete: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Incomplete' },
      incomplete_expired: { bg: 'bg-red-100', text: 'text-red-800', label: 'Expired' },
      past_due: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Past Due' },
      unpaid: { bg: 'bg-red-100', text: 'text-red-800', label: 'Unpaid' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
      { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-indigo-600">Subscription Details</span>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
                    getStatusBadge(subscription.status)
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      No Subscription
                    </span>
                  )}
                </dd>
              </div>
              {subscription && (
                <>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Started On</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {subscription.startDate?.toDate().toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Current Period</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {subscription.currentPeriodStart?.toDate().toLocaleDateString()} - {subscription.currentPeriodEnd?.toDate().toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {subscription.updatedAt?.toDate().toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Subscription ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {subscription.stripeSubscriptionId}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Customer ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {subscription.stripeCustomerId}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {subscription && ['active', 'trialing'].includes(subscription.status) ? (
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

        {subscription && ['active', 'trialing'].includes(subscription.status) && (
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
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}