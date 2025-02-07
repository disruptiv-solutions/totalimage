// Dashboard.tsx
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { withSubscription } from '../components/withSubscription';

function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { subscription } = useSubscription();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/subscription-details')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
              >
                Subscription Details
                {subscription?.subscriptionStatus === 'active' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                )}
                {subscription?.subscriptionStatus === 'trialing' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Trial
                  </span>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Welcome to Your Dashboard
            </h3>
            <div className="prose max-w-none">
              <p className="text-gray-700">
                Welcome {user.email}! You have {subscription?.subscriptionStatus} access to the dashboard.
              </p>
              <div className="mt-4 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-base font-medium text-gray-900 mb-2">Your Subscription Status</h4>
                  <p className="text-sm text-gray-600">
                    {subscription?.subscriptionStatus === 'trialing' ? (
                      <>Your trial period is active. Enjoy full access to all features!</>
                    ) : subscription?.subscriptionStatus === 'active' ? (
                      <>Your subscription is active. Thank you for being a valued customer!</>
                    ) : (
                      <>Please check your subscription details for the latest information.</>
                    )}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-base font-medium text-gray-900 mb-2">Quick Actions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => router.push('/subscription-details')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Manage Subscription
                    </button>
                    <button
                      onClick={() => router.push('/account-settings')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Account Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withSubscription(Dashboard);