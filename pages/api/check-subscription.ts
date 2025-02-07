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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = authHeader.split('Bearer ')[1];

    // Get customer data from Firestore
    const customerDoc = await adminDb.collection('customers').doc(userId).get();

    if (!customerDoc.exists) {
      return res.status(200).json({ hasActiveSubscription: false });
    }

    const data = customerDoc.data();
    const hasActiveSubscription = data?.subscriptionStatus === 'active';

    return res.status(200).json({ hasActiveSubscription });
  } catch (error: any) {
    console.error('Error checking subscription:', error);
    return res.status(500).json({ message: error.message });
  }
}