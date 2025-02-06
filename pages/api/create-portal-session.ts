import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

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

    // Retrieve the customer ID from your database based on the user ID
    // This is just an example - implement your own logic to get the customer ID
    const customerData = await fetch(`${process.env.API_URL}/api/get-customer?userId=${userId}`).then(r => r.json());

    const session = await stripe.billingPortal.sessions.create({
      customer: customerData.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating portal session:', err);
    return res.status(500).json({ message: err.message });
  }
}