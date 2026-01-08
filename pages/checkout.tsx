import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Shield, Loader, ArrowLeft, Check, Tag } from 'lucide-react';
import Link from 'next/link';

const stripePromise = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  : null;

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

type BillingPeriod = 'monthly' | 'yearly';

type PricingPreview = {
  appliedPromoCode: string;
  unitAmountOriginal: number;
  unitAmountDiscounted: number;
  discountAmount: number;
  currency: string;
  interval: 'month' | 'year';
};

const formatMoney = (amountInMinor: number, currency: string) => {
  const amount = amountInMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

interface CheckoutFormProps {
  initialPeriod?: BillingPeriod;
  onBillingPeriodChange?: (period: BillingPeriod) => void;
  pricingPreview: PricingPreview | null;
  onPricingPreviewChange: (next: PricingPreview | null) => void;
}

const CheckoutForm = ({
  initialPeriod = 'monthly',
  onBillingPeriodChange,
  pricingPreview,
  onPricingPreviewChange,
}: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initialPeriod);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'applying' | 'applied'>('idle');
  const [promoError, setPromoError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBillingPeriod(initialPeriod);
  }, [initialPeriod]);

  const handleBillingPeriodChange = (period: BillingPeriod) => {
    setBillingPeriod(period);
    onBillingPeriodChange?.(period);
    setPromoCode('');
    setPromoStatus('idle');
    setPromoError('');
    onPricingPreviewChange(null);
  };

  // Calculate yearly savings
  const monthlyTotal = 3.99 * 12;
  const yearlyPrice = 39.99;
  const savings = monthlyTotal - yearlyPrice;
  const savingsPercent = Math.round((savings / monthlyTotal) * 100);

  const selectedPriceId = billingPeriod === 'monthly' ? plan.monthlyPriceId : plan.yearlyPriceId;

  const basePriceDisplay = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const baseIntervalDisplay = billingPeriod === 'monthly' ? 'month' : 'year';

  const effectivePricing = useMemo(() => {
    if (!pricingPreview) {
      return {
        originalLabel: basePriceDisplay,
        discountedLabel: basePriceDisplay,
        intervalLabel: baseIntervalDisplay,
        hasDiscount: false,
        discountLabel: null as string | null,
      };
    }

    const original = formatMoney(pricingPreview.unitAmountOriginal, pricingPreview.currency);
    const discounted = formatMoney(pricingPreview.unitAmountDiscounted, pricingPreview.currency);
    const discount = formatMoney(pricingPreview.discountAmount, pricingPreview.currency);

    return {
      originalLabel: original,
      discountedLabel: discounted,
      intervalLabel: pricingPreview.interval,
      hasDiscount: pricingPreview.discountAmount > 0,
      discountLabel: discount,
    };
  }, [baseIntervalDisplay, basePriceDisplay, pricingPreview]);

  const handleApplyPromoCode = async () => {
    if (loading || promoStatus === 'applying') return;

    const code = promoCode.trim();
    if (!code) {
      setPromoError('Enter a promotion code first.');
      setPromoStatus('idle');
      onPricingPreviewChange(null);
      return;
    }

    try {
      setPromoStatus('applying');
      setPromoError('');
      setError('');

      const response = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoCode: code,
          priceId: selectedPriceId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to validate code');
      }

      if (!data.valid) {
        setPromoError(data.message || 'Invalid promotion code.');
        setPromoStatus('idle');
        onPricingPreviewChange(null);
        return;
      }

      onPricingPreviewChange({
        appliedPromoCode: data.appliedPromoCode,
        unitAmountOriginal: data.pricing.unitAmountOriginal,
        unitAmountDiscounted: data.pricing.unitAmountDiscounted,
        discountAmount: data.pricing.discountAmount,
        currency: data.price.currency,
        interval: data.price.interval,
      });

      setPromoStatus('applied');
    } catch (err: any) {
      setPromoError(err?.message || 'Failed to validate promotion code.');
      setPromoStatus('idle');
      onPricingPreviewChange(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: user.email || undefined,
          name: user.displayName || undefined,
        },
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      // Create subscription with selected price
      const priceId = selectedPriceId;

      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          priceId,
          paymentMethodId: paymentMethod.id,
          promoCode: pricingPreview?.appliedPromoCode ?? (promoCode.trim() ? promoCode.trim() : null),
          customerName: user.displayName || null,
          customerEmail: user.email || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create subscription');
      }

      const { clientSecret, status, requiresAction } = await response.json();

      if (status === 'active' || status === 'trialing') {
        // Subscription is already active, redirect to success
        window.location.href = '/?success=true';
        return;
      }

      // If payment requires action (3D Secure, etc.)
      if (requiresAction && clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: paymentMethod.id,
        });

        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      // Redirect to success page
      window.location.href = '/?success=true';
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        '::placeholder': {
          color: '#9ca3af',
        },
        backgroundColor: '#171717',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: false,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Billing Period Toggle */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Billing Period
        </label>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-1 flex gap-2">
          <button
            type="button"
            onClick={() => handleBillingPeriodChange('monthly')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
              billingPeriod === 'monthly'
                ? 'bg-[#4CAF50] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => handleBillingPeriodChange('yearly')}
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
          <p className="mt-2 text-sm text-[#4CAF50]">
            Save ${savings.toFixed(2)} per year with annual billing
          </p>
        )}
      </div>

      {/* Price Display */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Total Toon Tease</span>
          <div className="text-right">
            {effectivePricing.hasDiscount && (
              <div className="text-sm text-neutral-500 line-through">
                {effectivePricing.originalLabel}/{effectivePricing.intervalLabel}
              </div>
            )}
            <div className="text-xl font-bold text-white">
              {effectivePricing.discountedLabel}
              <span className="text-sm text-neutral-400 ml-1">/{effectivePricing.intervalLabel}</span>
            </div>
          </div>
        </div>
        {billingPeriod === 'yearly' && (
          <p className="text-xs text-neutral-500 mt-1">
            ${(parseFloat(plan.yearlyPrice.replace('$', '')) / 12).toFixed(2)}/month billed annually
          </p>
        )}
        {pricingPreview?.discountAmount ? (
          <p className="mt-2 text-sm text-[#4CAF50] flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Discount applied ({pricingPreview.appliedPromoCode}): -{formatMoney(pricingPreview.discountAmount, pricingPreview.currency)}
          </p>
        ) : null}
      </div>

      {/* Promo Code */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Promotion Code <span className="text-neutral-500 font-normal">(optional)</span>
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value);
              setPromoStatus('idle');
              setPromoError('');
              onPricingPreviewChange(null);
              if (error) setError('');
            }}
            placeholder="Enter code (e.g. IANTEST94)"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
            aria-label="Promotion code"
            autoComplete="off"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleApplyPromoCode}
            disabled={loading || promoStatus === 'applying'}
            className="px-5 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-semibold hover:border-[#4CAF50]/50 hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Apply promotion code"
          >
            {promoStatus === 'applying' ? 'Applying…' : 'Apply'}
          </button>
        </div>
        {promoError ? (
          <p className="mt-2 text-sm text-red-400">{promoError}</p>
        ) : promoStatus === 'applied' && pricingPreview ? (
          <p className="mt-2 text-sm text-[#4CAF50]">
            Code applied: <span className="font-semibold">{pricingPreview.appliedPromoCode}</span>
          </p>
        ) : null}
      </div>

      {/* Card Element */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Card Information
        </label>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-[#4CAF50] text-white text-lg font-semibold px-8 py-3 rounded-lg hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
            Processing...
          </>
        ) : (
          <>
            <Shield className="mr-2 h-5 w-5" />
            Subscribe Now
          </>
        )}
      </button>

      <p className="text-xs text-neutral-500 text-center">
        By subscribing, you authorize TotalToons34 to charge you according to the terms until you cancel.
      </p>
    </form>
  );
};

export default function Checkout() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentBillingPeriod, setCurrentBillingPeriod] = useState<BillingPeriod>('monthly');
  const [initialPeriod, setInitialPeriod] = useState<BillingPeriod>('monthly');
  const [pricingPreview, setPricingPreview] = useState<PricingPreview | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signup');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (router.query.period === 'yearly' || router.query.period === 'monthly') {
      const period = router.query.period as BillingPeriod;
      setInitialPeriod(period);
      setCurrentBillingPeriod(period);
      setPricingPreview(null);
    }
  }, [router.query]);

  if (authLoading) {
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
    return null;
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Stripe is not configured</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center text-neutral-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Checkout Form */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Subscribe to {plan.name}
            </h1>
            <p className="text-neutral-400 mb-8">
              Complete your subscription below
            </p>

            <Elements stripe={stripePromise}>
              <CheckoutForm 
                initialPeriod={initialPeriod} 
                onBillingPeriodChange={setCurrentBillingPeriod}
                pricingPreview={pricingPreview}
                onPricingPreviewChange={setPricingPreview}
              />
            </Elements>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-[#4CAF50] mt-0.5 flex-shrink-0 mr-3" />
                    <span className="text-neutral-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-800 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-neutral-400">Plan</span>
                  <span className="text-white font-semibold">{plan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Billing</span>
                  <span className="text-white font-semibold">
                    {currentBillingPeriod === 'monthly' ? 'Monthly' : 'Yearly'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-neutral-400">Price</span>
                  <span className="text-xl font-bold text-[#4CAF50]">
                    {pricingPreview
                      ? formatMoney(pricingPreview.unitAmountDiscounted, pricingPreview.currency)
                      : currentBillingPeriod === 'monthly'
                        ? plan.monthlyPrice
                        : plan.yearlyPrice}
                    <span className="text-sm text-neutral-400 ml-1">
                      /{pricingPreview ? pricingPreview.interval : (currentBillingPeriod === 'monthly' ? 'month' : 'year')}
                    </span>
                  </span>
                </div>
                {pricingPreview?.discountAmount ? (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-neutral-400">Discount</span>
                    <span className="text-white font-semibold">
                      -{formatMoney(pricingPreview.discountAmount, pricingPreview.currency)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-neutral-500">
              Cancel anytime. No commitments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
