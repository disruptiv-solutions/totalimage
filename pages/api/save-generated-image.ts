import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb, defaultBucket } from '../../lib/firebase-admin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

async function requireUser(req: NextApiRequest) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('Missing Authorization bearer token');
  const idToken = m[1];
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded;
}

async function fetchImageBytes(urlOrData: string): Promise<{ bytes: Buffer; contentType: string }>{
  if (urlOrData.startsWith('data:image/')) {
    const [, meta, b64] = urlOrData.match(/^data:(.+?);base64,(.+)$/) || [];
    if (!b64) throw new Error('Invalid data URL');
    return { bytes: Buffer.from(b64, 'base64'), contentType: meta };
  }
  const res = await fetch(urlOrData);
  if (!res.ok) throw new Error(`Fetch image failed: ${res.status}`);
  const ct = res.headers.get('content-type') || 'application/octet-stream';
  const ab = await res.arrayBuffer();
  return { bytes: Buffer.from(ab), contentType: ct };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const { sessionId, imageData, metadata } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    if (!imageData) return res.status(400).json({ error: 'imageData is required' });

    const isDataUrl = typeof imageData === 'string' && imageData.startsWith('data:');
    const isHttpUrl = typeof imageData === 'string' && imageData.startsWith('http');
    console.log(`[save-generated-image] Incoming payload:`, {
      uid: user.uid,
      sessionId,
      imageType: isDataUrl ? 'data-url' : (isHttpUrl ? 'http' : typeof imageData),
    });

    const { bytes, contentType } = await fetchImageBytes(imageData);
    console.log(`[save-generated-image] Byte size: ${bytes.length}, contentType: ${contentType}`);

    if (!defaultBucket) {
      console.error('[save-generated-image] Storage bucket not configured. Expected env FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
      return res.status(500).json({ error: 'Storage bucket not configured' });
    }
    console.log(`[save-generated-image] Using bucket: ${defaultBucket.name}`);

    const uid = user.uid;
    const ts = Date.now();
    const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'bin';
    // Store in the requested path inside the bucket
    const filename = `image-collections/sessions/${sessionId}/${ts}.${ext}`;
    const file = defaultBucket.file(filename);
    console.log(`[save-generated-image] Uploading to gs://${defaultBucket.name}/${filename}`);
    const token = crypto.randomUUID();
    await file.save(bytes, {
      resumable: false,
      public: false,
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
    console.log('[save-generated-image] Upload complete');
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${defaultBucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`;
    console.log(`[save-generated-image] Token URL generated: ${downloadUrl.slice(0, 120)}...`);

    const docRef = adminDb.collection('users').doc(uid)
      .collection('sessions').doc(sessionId)
      .collection('images').doc();

    const imageDoc = {
      id: docRef.id,
      path: filename,
      contentType,
      size: bytes.length,
      downloadUrl,
      createdAt: ts,
      metadata: metadata || {},
    };
    await docRef.set(imageDoc);

    // update session summary
    const sessionRef = adminDb.collection('users').doc(uid).collection('sessions').doc(sessionId);
    await sessionRef.set({ lastUpdated: ts }, { merge: true });
    await sessionRef.set({ imageCount: admin.firestore.FieldValue.increment(1) }, { merge: true });

    return res.status(200).json({ ok: true, image: imageDoc, bucket: defaultBucket.name, path: filename });
  } catch (e: any) {
    console.error('[save-generated-image] Error:', e);
    return res.status(500).json({ error: e.message || 'Failed to save image' });
  }
}


