import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { adminDb } from '../../lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export const config = {
  api: {
    bodyParser: false,
  },
};

async function updateSubscriptionStatus(
  customerId: string,
  subscription: Stripe.Subscription
) {
  console.log('=== updateSubscriptionStatus START ===');
  console.log('CustomerId:', customerId);
  console.log('Subscription:', JSON.stringify(subscription, null, 2));

  try {
    // Try to retrieve firebaseUID from Stripe customer metadata.
    const customer = await stripe.customers.retrieve(customerId);
    let userId: string | undefined;

    if ('metadata' in customer && customer.metadata.firebaseUID) {
      userId = customer.metadata.firebaseUID;
    }

    if (userId) {
      // If firebaseUID is available, look in the user's subscription subcollection.
      const subscriptionCollectionRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('subscriptions');

      const querySnapshot = await subscriptionCollectionRef
        .where('stripeCustomerId', '==', customerId)
        .where('stripeSubscriptionId', '==', subscription.id)
        .limit(1)
        .get();

      const updateData = {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        status: subscription.status,
        priceId: subscription.items.data[0].price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        updatedAt: new Date(),
      };

      if (querySnapshot.empty) {
        console.log('No matching document found. Creating new subscription document.');
        const newData = {
          ...updateData,
          startDate: new Date(subscription.start_date * 1000),
          createdAt: new Date(),
        };
        await subscriptionCollectionRef.doc(subscription.id).set(newData);
        console.log('Created new subscription document');
      } else {
        const docRef = querySnapshot.docs[0].ref;
        console.log('Found matching document. Updating document with:', JSON.stringify(updateData, null, 2));
        await docRef.update(updateData);
        console.log('Updated existing subscription document');
      }
    } else {
      // Otherwise, find the subscription document across all users using a collectionGroup query.
      console.log('firebaseUID not found in customer metadata. Searching via collectionGroup query.');
      const subscriptionsQuery = adminDb
        .collectionGroup('subscriptions')
        .where('stripeCustomerId', '==', customerId)
        .where('stripeSubscriptionId', '==', subscription.id)
        .limit(1);
      const querySnapshot = await subscriptionsQuery.get();

      const updateData = {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        status: subscription.status,
        priceId: subscription.items.data[0].price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        updatedAt: new Date(),
      };

      if (querySnapshot.empty) {
        console.log('No matching subscription document found via collectionGroup query.');
      } else {
        const docRef = querySnapshot.docs[0].ref;
        console.log('Found matching document via collectionGroup query. Updating document with:', JSON.stringify(updateData, null, 2));
        await docRef.update(updateData);
        console.log('Updated existing subscription document via collectionGroup query');
      }
    }

    console.log(`Successfully updated subscription ${subscription.id} for customer ${customerId}`);
  } catch (error) {
    console.error('Error in updateSubscriptionStatus:', error);
    throw error;
  }
  console.log('=== updateSubscriptionStatus END ===');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== Webhook Handler START ===');
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('No webhook secret configured');
    return res.status(500).json({ message: 'Webhook secret is not configured' });
  }

  try {
    const rawBody = await buffer(req);
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ message: 'Webhook signature verification failed' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.client_reference_id) {
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const subscriptionRef = adminDb
            .collection('users')
            .doc(session.client_reference_id)
            .collection('subscriptions')
            .doc(subscriptionId);

          const newData = {
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer,
            status: subscription.status,
            priceId: subscription.items.data[0].price.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            startDate: new Date(subscription.start_date * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await subscriptionRef.set(newData);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatus(subscription.customer as string, subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await updateSubscriptionStatus(invoice.customer as string, subscription);
        }
        break;
      }
      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ message: 'Webhook handler failed' });
  } finally {
    console.log('=== Webhook Handler END ===');
  }
}
