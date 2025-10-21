import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '../../lib/firebase-admin';

async function requireUser(req: NextApiRequest) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('Missing Authorization bearer token');
  const idToken = m[1];
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await requireUser(req);
    const uid = user.uid;
    const { sessionId } = req.query as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const imagesSnap = await adminDb.collection('users').doc(uid)
      .collection('sessions').doc(sessionId)
      .collection('images').orderBy('createdAt', 'desc').limit(200).get();

    const images = imagesSnap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
    return res.status(200).json({ images });
  } catch (e: any) {
    return res.status(401).json({ error: e.message || 'Unauthorized' });
  }
}


