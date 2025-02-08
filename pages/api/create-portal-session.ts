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
  console.log('Received request for create-portal-session with method:', req.method);

  if (req.method !== 'POST') {
    console.error('Method not allowed:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, returnUrl } = req.body;
    console.log('Request body:', req.body);

    if (!userId) {
      console.error('Missing userId in request body');
      return res.status(400).json({ message: 'Missing required parameter: userId' });
    }

    console.log(`Fetching subscription for userId: ${userId}`);
    // Retrieve the subscription document from Firestore.
    const subscriptionQuery = await adminDb
      .collection('users')
      .doc(userId)
      .collection('subscription')
      .limit(1)
      .get();

    let stripeCustomerId: string | undefined;
    let subscriptionData: any;

    if (!subscriptionQuery.empty) {
      const doc = subscriptionQuery.docs[0];
      subscriptionData = doc.data();
      console.log('Retrieved subscription document:', subscriptionData);

      const allowedStatuses = ['active', 'trialing'];
      if (!allowedStatuses.includes(subscriptionData.status)) {
        console.warn(`Subscription status ${subscriptionData.status} is not allowed for portal access.`);
        return res.status(400).json({ message: `Subscription status ${subscriptionData.status} cannot access the portal` });
      }

      stripeCustomerId = subscriptionData.stripeCustomerId;
      console.log('Stripe customer ID from subscription document:', stripeCustomerId);
    } else {
      console.warn('No subscription document found for user:', userId);
    }

    if (!stripeCustomerId) {
      console.error('Stripe customer ID not found for user:', userId);
      return res.status(404).json({ message: 'Stripe customer not found for this user' });
    }

    // Set the return URL to subscription-details as the default.
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const finalReturnUrl = returnUrl || `${BASE_URL}/subscription-details`;
    console.log('Using return URL:', finalReturnUrl);

    // Use a custom portal configuration if provided; otherwise, create one dynamically.
    let portalConfiguration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    if (!portalConfiguration) {
      console.log('No custom portal configuration provided. Creating default configuration...');
      const configuration = await stripe.billingPortal.configurations.create({
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: true, mode: 'at_period_end' },
        },
        business_profile: {
          privacy_policy_url: 'https://yourdomain.com/privacy',
          terms_of_service_url: 'https://yourdomain.com/tos',
        },
      });
      portalConfiguration = configuration.id;
      console.log('Created portal configuration:', portalConfiguration);
    } else {
      console.log('Using custom portal configuration from environment:', portalConfiguration);
    }

    // Create a Stripe Billing Portal session with the configuration.
    console.log('Creating billing portal session for stripeCustomerId:', stripeCustomerId);
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: finalReturnUrl,
      configuration: portalConfiguration,
    });
    console.log('Successfully created billing portal session:', session.id);
    console.log('Stripe session details:', session);

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating portal session:', err);
    if (err.raw) {
      console.error('Stripe error details:', err.raw);
    }
    return res.status(500).json({
      message: 'Error creating portal session',
      error: err.message,
    });
  }
}
