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
  try {
    const user = await requireUser(req);
    const uid = user.uid;

    const sessionsCol = adminDb.collection('users').doc(uid).collection('sessions');

    if (req.method === 'GET') {
      const snap = await sessionsCol.orderBy('lastUpdated', 'desc').get();
      const sessions = snap.docs.map(d => ({ id: d.id, imageCount: 0, ...(d.data() || {}) }));
      return res.status(200).json({ sessions });
    }

    if (req.method === 'POST') {
      const { name, description } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name is required' });
      const now = Date.now();
      const doc = await sessionsCol.add({
        name,
        description: description || '',
        createdAt: now,
        lastUpdated: now,
        imageCount: 0,
        status: 'active'
      });
      return res.status(200).json({ sessionId: doc.id, session: { id: doc.id, name, description: description || '', createdAt: now, lastUpdated: now, imageCount: 0, status: 'active' } });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(401).json({ error: e.message || 'Unauthorized' });
  }
}


