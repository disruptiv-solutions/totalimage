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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get the customer from Firestore
    const customerDoc = await adminDb.collection('customers').doc(userId).get();

    if (!customerDoc.exists) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const { stripeCustomerId } = customerDoc.data() || {};

    if (!stripeCustomerId) {
      return res.status(404).json({ message: 'Stripe customer ID not found' });
    }

    // Create Stripe Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ message: error.message });
  }
}