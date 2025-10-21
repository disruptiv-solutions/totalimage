import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb, defaultBucket } from '../../lib/firebase-admin';
import * as admin from 'firebase-admin';

async function requireUser(req: NextApiRequest) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('Missing Authorization bearer token');
  const idToken = m[1];
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const user = await requireUser(req);
    const { imageId, sessionId } = req.body;
    
    if (!imageId) return res.status(400).json({ error: 'imageId is required' });
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const uid = user.uid;
    
    // Get the image document to retrieve the file path
    const imageDoc = await adminDb.collection('users').doc(uid)
      .collection('sessions').doc(sessionId)
      .collection('images').doc(imageId).get();
    
    if (!imageDoc.exists) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageData = imageDoc.data();
    const filePath = imageData?.path;

    // Delete the image document from Firestore
    await adminDb.collection('users').doc(uid)
      .collection('sessions').doc(sessionId)
      .collection('images').doc(imageId).delete();

    // Delete the file from Firebase Storage if we have the path
    if (filePath && defaultBucket) {
      try {
        const file = defaultBucket.file(filePath);
        await file.delete();
        console.log(`[delete-image] Deleted file: ${filePath}`);
      } catch (storageError) {
        console.warn(`[delete-image] Failed to delete file from storage: ${filePath}`, storageError);
        // Don't fail the whole operation if storage deletion fails
      }
    }

    // Update session image count
    const sessionRef = adminDb.collection('users').doc(uid).collection('sessions').doc(sessionId);
    await sessionRef.update({ 
      imageCount: admin.firestore.FieldValue.increment(-1),
      lastUpdated: Date.now()
    });

    return res.status(200).json({ ok: true, deleted: true });
  } catch (e: any) {
    console.error('[delete-image] Error:', e);
    return res.status(500).json({ error: e.message || 'Failed to delete image' });
  }
}
