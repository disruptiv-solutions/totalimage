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
    const { userId, priceId } = req.body;

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription?canceled=true`,
      client_reference_id: userId,
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    return res.status(500).json({ message: err.message });
  }
}