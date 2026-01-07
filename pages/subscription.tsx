
// pages/subscription.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../lib/stripe';
import { Shield, Clock, Camera, Check, Loader, Sparkles, Star, Calendar } from 'lucide-react';

const plan = {
  name: 'Total Toon Tease',
  monthlyPrice: '$3.99',
  yearlyPrice: '$39.99',
  monthlyPriceId: 'price_1Sn6PePNFjVZijl9sglHMWri',
  yearlyPriceId: 'price_1Sn6QMPNFjVZijl9TV2mIPxb',
  features: [
    'Full access to all TotalToons34 galleries',
    'Unlimited high-resolution image downloads',
    'Early access to new collections',
    'Priority support',
    'Ad-free experience',
    'Download history tracking'
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

type BillingPeriod = 'monthly' | 'yearly';

export default function Subscription() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canceled, setCanceled] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  // Handle canceled checkout redirect
  useEffect(() => {
    if (router.query.canceled === 'true') {
      setCanceled(true);
      // Remove query params from URL
      router.replace('/subscription', undefined, { shallow: true });
      // Hide canceled message after 5 seconds
      const timer = setTimeout(() => {
        setCanceled(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [router.query]);

  const handleSubscribe = async () => {
    if (!user || !user.email) {
      router.push('/signup');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const customerResponse = await fetch(`/api/get-customer?userId=${user.uid}`);
      let customerId;

      if (!customerResponse.ok) {
        console.log('Creating new Stripe customer...');
        customerId = await createStripeCustomer(user.uid, user.email);
      } else {
        const customerData = await customerResponse.json();
        customerId = customerData.customerId;
      }

      const priceId = billingPeriod === 'monthly' ? plan.monthlyPriceId : plan.yearlyPriceId;
      await createCheckoutSession(user.uid, priceId);
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError('Failed to start subscription process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate yearly savings
  const monthlyTotal = 3.99 * 12; // $47.88
  const yearlyPrice = 39.99;
  const savings = monthlyTotal - yearlyPrice; // $7.89
  const savingsPercent = Math.round((savings / monthlyTotal) * 100); // ~16%

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
            Total<span className="text-[#4CAF50]">Toons</span>
            <span className="text-[#4CAF50]">34</span>
          </h1>
          <h2 className="text-3xl font-bold text-white mt-8">
            Unlock Premium Access
          </h2>
          <p className="mt-4 text-xl text-neutral-400">
            Join our exclusive community of digital art enthusiasts
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-1 flex gap-2">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                billingPeriod === 'monthly'
                  ? 'bg-[#4CAF50] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 relative ${
                billingPeriod === 'yearly'
                  ? 'bg-[#4CAF50] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Yearly
              {billingPeriod === 'yearly' && (
                <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  Save {savingsPercent}%
                </span>
              )}
            </button>
          </div>
          {billingPeriod === 'yearly' && (
            <p className="mt-2 text-center text-sm text-[#4CAF50]">
              Save ${savings.toFixed(2)} per year with annual billing
            </p>
          )}
        </div>

        {canceled && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
              <div className="text-sm text-yellow-400">Checkout was canceled. You can try again anytime.</div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <div className="text-sm text-red-400">{error}</div>
            </div>
          </div>
        )}

        <div className="mt-12 max-w-lg mx-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

            <div className="p-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-[#4CAF50]">
                    {billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-neutral-400 ml-1">
                    /{billingPeriod === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
              </div>
              {billingPeriod === 'yearly' && (
                <p className="text-sm text-neutral-400 mb-4">
                  ${(parseFloat(plan.yearlyPrice.replace('$', '')) / 12).toFixed(2)}/month billed annually
                </p>
              )}

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="mt-8 w-full bg-[#4CAF50] text-white text-lg font-semibold px-8 py-3 rounded-lg hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Processing...
                  </>
                ) : user ? (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Subscribe Now
                  </>
                ) : (
                  'Create Account to Subscribe'
                )}
              </button>

              {!user && (
                <div className="mt-4 flex justify-center space-x-4 text-sm">
                  <button
                    onClick={() => router.push('/signup')}
                    className="text-[#4CAF50] hover:text-[#45a049] font-medium"
                  >
                    Create account
                  </button>
                  <span className="text-neutral-500">or</span>
                  <button
                    onClick={() => router.push('/signin')}
                    className="text-[#4CAF50] hover:text-[#45a049] font-medium"
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-800 p-8">
              <h4 className="text-lg font-semibold text-white mb-6 flex items-center">
                <Star className="h-5 w-5 text-[#4CAF50] mr-2" />
                Premium Features
              </h4>
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-[#4CAF50] mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Cancel anytime. No commitments.
          </p>
        </div>
      </div>
    </div>
  );
}
