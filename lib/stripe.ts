import { loadStripe, Stripe } from '@stripe/stripe-js';

// Only initialize Stripe if the key is available
export const stripePromise: Promise<Stripe | null> | null = 
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

export const createCheckoutSession = async (userId: string, priceId: string) => {
  try {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      throw new Error('Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
    }

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        priceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    
    if (!stripePromise) {
      throw new Error('Stripe is not configured');
    }

    const stripe = await stripePromise;

    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('Checkout error:', error);
    throw error;
  }
};

export const getSubscription = async (userId: string) => {
  try {
    const response = await fetch(`/api/get-subscription?userId=${userId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch subscription');
    }

    const data = await response.json();
    return data.subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
};
