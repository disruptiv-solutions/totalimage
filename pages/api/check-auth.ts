import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '../../lib/firebase-admin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = authHeader.split('Bearer ')[1];

    // Verify the user exists and has an active subscription
    const customerDoc = await adminDb.collection('customers').doc(userId).get();

    if (!customerDoc.exists) {
      return res.json({ hasAccess: false });
    }

    const data = customerDoc.data();
    const hasActiveSubscription = data?.subscriptionStatus === 'active';

    return res.json({ 
      hasAccess: hasActiveSubscription,
      subscriptionStatus: data?.subscriptionStatus
    });

  } catch (error) {
    console.error('Error checking auth:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      hasAccess: false 
    });
  }
}