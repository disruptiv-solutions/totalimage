import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

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
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Retrieve the customer ID from your database based on the user ID
    // This is just an example - implement your own logic to get the customer ID
    const customerData = await fetch(`${process.env.API_URL}/api/get-customer?userId=${userId}`).then(r => r.json());

    if (!customerData.stripeCustomerId) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerData.stripeCustomerId,
      status: 'active',
      expand: ['data.default_payment_method'],
    });

    if (!subscriptions.data.length) {
      return res.status(200).json({ subscription: null });
    }

    const subscription = subscriptions.data[0];

    // Get the product details
    const product = await stripe.products.retrieve(
      subscription.items.data[0].price.product as string
    );

    return res.status(200).json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: product.name,
        interval: subscription.items.data[0].price.recurring?.interval,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  } catch (err: any) {
    console.error('Error fetching subscription:', err);
    return res.status(500).json({ message: err.message });
  }
}