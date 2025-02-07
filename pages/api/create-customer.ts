import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { adminDb } from '../../lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, email } = req.query;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'User ID is required' });
    }

    console.log('Checking customer for userId:', userId);

    // Check if customer exists in Firestore using adminDb
    const customerDoc = await adminDb.collection('customers').doc(userId).get();
    if (customerDoc.exists) {
      const data = customerDoc.data();
      console.log('Existing customer found:', data?.stripeCustomerId);

      // Update metadata if it's missing
      if (data?.stripeCustomerId) {
        const stripeCustomer = await stripe.customers.retrieve(data.stripeCustomerId);
        if ('metadata' in stripeCustomer && !stripeCustomer.metadata.firebaseUID) {
          await stripe.customers.update(data.stripeCustomerId, {
            metadata: {
              firebaseUID: userId
            }
          });
          console.log('Updated missing metadata for customer:', data.stripeCustomerId);
        }
      }

      return res.status(200).json({
        stripeCustomerId: data?.stripeCustomerId
      });
    }

    console.log('Creating new Stripe customer for userId:', userId);
    // If customer doesn't exist, create a new one in Stripe
    const customer = await stripe.customers.create({
      email: email as string,
      metadata: {
        firebaseUID: userId
      }
    });

    console.log('Created Stripe customer:', customer.id);

    // Store the customer ID in Firestore using adminDb
    await adminDb.collection('customers').doc(userId).set({
      stripeCustomerId: customer.id,
      email: customer.email,
      created: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return res.status(200).json({
      stripeCustomerId: customer.id
    });
  } catch (error: any) {
    console.error('Error handling customer:', error);
    return res.status(500).json({ message: error.message });
  }
}