import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { adminDb } from '../../lib/firebase-admin';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, priceId, paymentMethodId } = req.body;

    if (!userId || !priceId || !paymentMethodId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    if (!adminDb) {
      console.error('[ERROR] Firebase Admin DB is not initialized');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    console.log(`[DEBUG] Creating subscription for userId: ${userId} with priceId: ${priceId}`);

    // Get or create Stripe customer
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
        console.log(`[DEBUG] Active subscription found. stripeCustomerId: ${stripeCustomerId}`);
      }
    } catch (dbError: any) {
      console.warn(`[WARN] Error querying subscriptions (non-fatal): ${dbError.message}`);
    }

    // If no customer found, get customer from get-customer API or create one
    if (!stripeCustomerId) {
      // Try to get customer ID from Stripe using payment method
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (paymentMethod.customer) {
        stripeCustomerId = paymentMethod.customer as string;
      } else {
        // Create new customer
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const customer = await stripe.customers.create({
          email: userData?.email,
          metadata: {
            firebaseUID: userId,
          },
        });
        stripeCustomerId = customer.id;
        console.log(`[DEBUG] Created new Stripe customer: ${stripeCustomerId}`);
      }
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    // Set as default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

    if (!paymentIntent || paymentIntent.status !== 'requires_payment_method') {
      // Subscription is active or needs action
      return res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret,
        status: subscription.status,
      });
    }

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      status: subscription.status,
    });
  } catch (error: any) {
    console.error(`[ERROR] Error creating subscription: ${error.message}\nStack: ${error.stack}`);
    return res.status(500).json({
      message: 'Error creating subscription',
      error: error.message,
    });
  }
}
