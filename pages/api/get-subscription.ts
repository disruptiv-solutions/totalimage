import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { adminDb } from '../../lib/firebase-admin';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'User ID is required' });
    }

    console.log('Fetching customer data for userId:', userId);

    // Get customer data from Firestore
    const customerDoc = await adminDb.collection('customers').doc(userId).get();

    if (!customerDoc.exists) {
      console.log('No customer found for userId:', userId);
      return res.status(200).json({ subscription: null });
    }

    const data = customerDoc.data();
    const stripeCustomerId = data?.stripeCustomerId;

    if (!stripeCustomerId) {
      console.log('No stripeCustomerId found for userId:', userId);
      return res.status(200).json({ subscription: null });
    }

    console.log('Found stripeCustomerId:', stripeCustomerId);

    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      expand: ['data.default_payment_method'],
    });

    if (!subscriptions.data.length) {
      console.log('No active subscriptions found');
      return res.status(200).json({ subscription: null });
    }

    const subscription = subscriptions.data[0];
    const productId = subscription.items.data[0].price.product as string;

    // Get the product details
    const product = await stripe.products.retrieve(productId);

    const subscriptionData = {
      id: subscription.id,
      status: subscription.status,
      plan: product.name,
      interval: subscription.items.data[0].price.recurring?.interval,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    console.log('Returning subscription data:', subscriptionData);

    return res.status(200).json({
      subscription: subscriptionData
    });

  } catch (error: any) {
    console.error('Error in get-subscription API:', error);

    // Send a proper error response
    return res.status(500).json({
      error: true,
      message: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}