import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { adminDb } from '../../lib/firebase-admin';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, priceId } = req.body;

    if (!userId || !priceId) {
      return res.status(400).json({ 
        message: 'Missing required parameters' 
      });
    }

    console.log('Creating checkout session with:', { userId, priceId });

    // Get or create customer
    const subscriptionQuery = await adminDb
      .collection('users')
      .doc(userId)
      .collection('subscriptions')
      .where('status', '==', 'active')
      .limit(1)
      .get();

    let stripeCustomerId;
    if (!subscriptionQuery.empty) {
      stripeCustomerId = subscriptionQuery.docs[0].data().stripeCustomerId;
    }

    // Create Checkout Session with promotion code support
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true, // Enable coupon field in checkout
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'create_invoice',
          },
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription?canceled=true`,
      client_reference_id: userId,
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ sessionId: session.id });
  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    return res.status(500).json({ 
      message: 'Error creating checkout session',
      error: err.message 
    });
  }
}