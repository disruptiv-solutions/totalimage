import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, defaultBucket } from '../../lib/firebase-admin';
import crypto from 'crypto';

async function requireUser(req: NextApiRequest) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('Missing Authorization bearer token');
  const idToken = m[1];
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await requireUser(req);
    const { path } = req.body || {};
    if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required' });
    if (!defaultBucket) return res.status(500).json({ error: 'Storage bucket not configured' });

    const file = defaultBucket.file(path);
    const token = crypto.randomUUID();
    await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${defaultBucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return res.status(200).json({ ok: true, downloadUrl, token });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to rotate token' });
  }
}


