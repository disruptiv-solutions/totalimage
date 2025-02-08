import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { CreditCard, Calendar, Clock, User, Shield, Settings, Star } from 'lucide-react';

export default function SubscriptionDetails() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-[#4CAF50]/20 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#4CAF50] animate-spin"></div>
        </div>
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
      active: { bg: 'bg-[#4CAF50]/10', text: 'text-[#4CAF50]', label: 'Active' },
      trialing: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Trial' },
      canceled: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Canceled' },
      incomplete: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Incomplete' },
      incomplete_expired: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Expired' },
      past_due: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Past Due' },
      unpaid: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Unpaid' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
      { bg: 'bg-neutral-500/10', text: 'text-neutral-400', label: status };

    return (
      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-black pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-neutral-900 overflow-hidden rounded-2xl border border-neutral-800">
          <div className="px-6 py-5">
            <h3 className="text-2xl font-bold text-white flex items-center">
              <CreditCard className="w-6 h-6 mr-2 text-[#4CAF50]" />
              Subscription Details
            </h3>
          </div>
          <div className="px-6 py-8 border-t border-neutral-800">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-neutral-400 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Email
                </dt>
                <dd className="mt-1 text-base text-white">{user.email}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-neutral-400 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Status
                </dt>
                <dd className="mt-1">
                  {subscription ? (
                    getStatusBadge(subscription.status)
                  ) : (
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-neutral-500/10 text-neutral-400">
                      No Subscription
                    </span>
                  )}
                </dd>
              </div>
              {subscription && (
                <>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-neutral-400 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Started On
                    </dt>
                    <dd className="mt-1 text-base text-white">
                      {subscription.startDate?.toDate().toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-neutral-400 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Current Period
                    </dt>
                    <dd className="mt-1 text-base text-white">
                      {subscription.currentPeriodStart?.toDate().toLocaleDateString()} - {subscription.currentPeriodEnd?.toDate().toLocaleDateString()}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
          <div className="px-6 py-4 bg-neutral-800/50 flex justify-between items-center">
            {subscription && ['active', 'trialing'].includes(subscription.status) ? (
              <button
                onClick={handleManageSubscription}
                className="inline-flex items-center px-6 py-2.5 rounded-lg text-white bg-[#4CAF50] hover:bg-[#45a049] transition-colors duration-200 text-sm font-semibold"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Subscription
              </button>
            ) : (
              <button
                onClick={() => router.push('/subscription')}
                className="inline-flex items-center px-6 py-2.5 rounded-lg text-white bg-[#4CAF50] hover:bg-[#45a049] transition-colors duration-200 text-sm font-semibold"
              >
                <Shield className="w-4 h-4 mr-2" />
                Get Premium Access
              </button>
            )}
          </div>
        </div>

        {subscription && ['active', 'trialing'].includes(subscription.status) && (
          <div className="mt-8">
            <div className="bg-neutral-900 overflow-hidden rounded-2xl border border-neutral-800">
              <div className="px-6 py-8">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Star className="w-5 h-5 text-[#4CAF50] mr-2" />
                  Premium Access Active
                </h3>
                <p className="text-neutral-400">
                  You have full access to all TotalToons34 galleries and content. New artwork is added weekly.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}