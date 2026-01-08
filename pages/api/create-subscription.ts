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
    const { userId, priceId, paymentMethodId, promoCode, customerName, customerEmail } = req.body;

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
          email: (typeof customerEmail === 'string' && customerEmail.trim() ? customerEmail.trim() : userData?.email) || undefined,
          name: (typeof customerName === 'string' && customerName.trim() ? customerName.trim() : undefined),
          metadata: {
            firebaseUID: userId,
          },
        });
        stripeCustomerId = customer.id;
        console.log(`[DEBUG] Created new Stripe customer: ${stripeCustomerId}`);
      }
    }

    // Ensure Stripe customer has firebaseUID metadata + latest name/email (without nuking existing metadata)
    try {
      const existingCustomer = await stripe.customers.retrieve(stripeCustomerId);
      const existingMetadata =
        typeof existingCustomer === 'object' && 'metadata' in existingCustomer ? existingCustomer.metadata : {};

      await stripe.customers.update(stripeCustomerId, {
        ...(typeof customerEmail === 'string' && customerEmail.trim()
          ? { email: customerEmail.trim() }
          : {}),
        ...(typeof customerName === 'string' && customerName.trim() ? { name: customerName.trim() } : {}),
        metadata: {
          ...(existingMetadata ?? {}),
          firebaseUID: userId,
        },
      });
    } catch (custUpdateErr: any) {
      console.warn(`[WARN] Failed to sync Stripe customer metadata/name/email: ${custUpdateErr.message}`);
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

    let promotionCodeId: string | null = null;
    let appliedPromoCode: string | null = null;

    if (typeof promoCode === 'string' && promoCode.trim()) {
      const normalized = promoCode.trim();
      try {
        const promoList = await stripe.promotionCodes.list({
          code: normalized,
          active: true,
          limit: 1,
        });

        const promo = promoList.data[0];
        if (!promo) {
          return res.status(400).json({ message: 'Invalid or inactive promotion code.' });
        }

        promotionCodeId = promo.id;
        appliedPromoCode = promo.code ?? normalized;
      } catch (promoErr: any) {
        console.error(`[ERROR] Failed to validate promo code: ${promoErr.message}`);
        return res.status(500).json({ message: 'Failed to validate promotion code.' });
      }
    }

    // Create subscription with payment method already attached
    // Since payment method is attached, Stripe will attempt to charge it immediately
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      ...(promotionCodeId
        ? {
            discounts: [{ promotion_code: promotionCodeId }],
          }
        : {}),
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

    // Check subscription and payment intent status
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Subscription is already active - payment succeeded
      return res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: null,
        status: subscription.status,
        requiresAction: false,
        appliedPromoCode,
      });
    }

    // If payment intent requires action (3D Secure, etc.)
    if (paymentIntent && (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_payment_method')) {
      return res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
        status: subscription.status,
        requiresAction: true,
        appliedPromoCode,
      });
    }

    // Default response
    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || null,
      status: subscription.status,
      requiresAction: false,
      appliedPromoCode,
    });
  } catch (error: any) {
    console.error(`[ERROR] Error creating subscription: ${error.message}\nStack: ${error.stack}`);
    return res.status(500).json({
      message: 'Error creating subscription',
      error: error.message,
    });
  }
}
