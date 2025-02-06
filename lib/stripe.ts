import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const createCheckoutSession = async (userId: string, priceId: string) => {
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

  const { sessionId } = await response.json();
  const stripe = await stripePromise;

  if (stripe) {
    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
};

export const getSubscription = async (userId: string) => {
  try {
    const response = await fetch(`/api/get-subscription?userId=${userId}`);
    const data = await response.json();
    return data.subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
};