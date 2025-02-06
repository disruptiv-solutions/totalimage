import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../lib/stripe';

const plans = [
  {
    name: 'Basic',
    price: '$9.99',
    priceId: 'price_basic123', // Replace with your Stripe Price ID
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
  },
  {
    name: 'Pro',
    price: '$19.99',
    priceId: 'price_pro123', // Replace with your Stripe Price ID
    features: ['All Basic features', 'Feature 4', 'Feature 5', 'Feature 6'],
  },
  {
    name: 'Enterprise',
    price: '$49.99',
    priceId: 'price_enterprise123', // Replace with your Stripe Price ID
    features: ['All Pro features', 'Feature 7', 'Feature 8', 'Priority Support'],
  },
];

export default function Subscription() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    }
  }, [user, router]);

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      setError('Please sign in first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await createCheckoutSession(user.uid, priceId);
    } catch (err) {
      setError('Failed to start subscription process');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose your plan
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Select the perfect plan for your needs
          </p>
        </div>

        {error && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white"
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                <p className="mt-4 text-sm text-gray-500">
                  Perfect for growing businesses
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-base font-medium text-gray-500">
                    /month
                  </span>
                </p>
                <button
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={loading}
                  className="mt-8 block w-full bg-indigo-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : `Subscribe to ${plan.name}`}
                </button>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h4 className="text-sm font-medium text-gray-900 tracking-wide">
                  What's included
                </h4>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex space-x-3">
                      <svg
                        className="flex-shrink-0 h-5 w-5 text-green-500"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}