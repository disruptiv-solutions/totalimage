import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { adminDb } from '../../lib/firebase-admin';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`[DEBUG] Received ${req.method} request with body:`, req.body);

  if (req.method !== 'POST') {
    console.error(`[ERROR] Method not allowed: ${req.method}`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, priceId } = req.body;

    if (!userId || !priceId) {
      console.error(`[ERROR] Missing required parameters. userId: ${userId}, priceId: ${priceId}`);
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    if (!adminDb) {
      console.error('[ERROR] Firebase Admin DB is not initialized');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    console.log(`[DEBUG] Creating checkout session for userId: ${userId} with priceId: ${priceId}`);

    // Retrieve active subscription if any
    let stripeCustomerId: string | undefined;
    try {
      const subscriptionQuery = await adminDb
        .collection('users')
        .doc(userId)
        .collection('subscriptions')
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!subscriptionQuery.empty) {
        stripeCustomerId = subscriptionQuery.docs[0].data().stripeCustomerId;
        console.log(`[DEBUG] Active subscription found for userId ${userId}. stripeCustomerId: ${stripeCustomerId}`);
      } else {
        console.log(`[DEBUG] No active subscription found for userId: ${userId}`);
      }
    } catch (dbError: any) {
      console.warn(`[WARN] Error querying subscriptions (non-fatal): ${dbError.message}`);
      // Continue without customer ID - Stripe will create a new customer
    }

    // Log the environment variable for base URL
    console.log(`[DEBUG] NEXT_PUBLIC_BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL}`);

    // Build the session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription?canceled=true`,
      client_reference_id: userId,
    };

    if (stripeCustomerId) {
      sessionConfig.customer = stripeCustomerId;
    } else {
      console.log(`[DEBUG] No stripeCustomerId available; Stripe will create a new customer.`);
    }

    console.debug('[DEBUG] Final checkout session config:', sessionConfig);

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log(`[DEBUG] Checkout session created successfully with id: ${session.id}`);

    return res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error(`[ERROR] Error creating checkout session: ${error.message}\nStack: ${error.stack}`);
    return res.status(500).json({
      message: 'Error creating checkout session',
      error: error.message,
    });
  }
}