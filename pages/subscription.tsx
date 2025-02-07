import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../lib/stripe';

const plan = {
  name: 'Basic',
  price: '$9.99',
  priceId: 'price_1QpssaPNFjVZijl9NDZ1zznm',
  features: [
    'Access to all basic features',
    'Email support',
    'Up to 1000 requests per month',
    'Basic analytics'
  ],
};

const createStripeCustomer = async (userId: string, email: string) => {
  try {
    const response = await fetch('/api/create-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create Stripe customer');
    }

    const data = await response.json();
    return data.customerId;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

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

  const handleSubscribe = async () => {
    if (!user || !user.email) {
      setError('Please sign in first');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // First, check if customer exists
      const customerResponse = await fetch(`/api/get-customer?userId=${user.uid}`);
      let customerId;

      if (!customerResponse.ok) {
        // Create new customer if doesn't exist
        console.log('Creating new Stripe customer...');
        customerId = await createStripeCustomer(user.uid, user.email);
      } else {
        const customerData = await customerResponse.json();
        customerId = customerData.customerId;
      }

      // Create checkout session
      await createCheckoutSession(user.uid, plan.priceId);
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError('Failed to start subscription process. Please try again.');
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
            Subscribe to Our Service
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Get started with our comprehensive basic plan
          </p>
        </div>

        {error && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        <div className="mt-12 max-w-lg mx-auto">
          <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
            <div className="p-6">
              <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-4 text-sm text-gray-500">
                Everything you need to get started
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
                onClick={handleSubscribe}
                disabled={loading}
                className="mt-8 block w-full bg-indigo-600 border border-transparent rounded-md py-3 text-sm font-semibold text-white text-center hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Subscribe Now'}
              </button>
            </div>
            <div className="pt-6 pb-8 px-6">
              <h4 className="text-sm font-medium text-gray-900 tracking-wide mb-4">
                What's included
              </h4>
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <svg
                      className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5"
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
                    <span className="ml-3 text-sm text-gray-500">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}