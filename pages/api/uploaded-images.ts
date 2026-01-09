import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '../../lib/firebase-admin';

type UploadedImage = {
  id: string;
  url: string;
  name?: string;
  type?: string;
  size?: number;
  path?: string;
  uploadedAt?: string;
  galleryId: string;
  galleryName?: string;
  setId: string;
  setName?: string;
};

async function requireUser(req: NextApiRequest) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('Missing Authorization bearer token');
  const idToken = m[1];
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded;
}

const normalizeCategory = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const uid = user.uid;

    const galleriesSnap = await adminDb
      .collection('users')
      .doc(uid)
      .collection('galleries')
      .limit(100)
      .get();

    const results: UploadedImage[] = [];

    await Promise.all(
      galleriesSnap.docs.map(async (galleryDoc) => {
        const galleryId = galleryDoc.id;
        const galleryName = galleryDoc.data()?.name as string | undefined;
        const setsSnap = await adminDb
          .collection('users')
          .doc(uid)
          .collection('galleries')
          .doc(galleryId)
          .collection('sets')
          .limit(100)
          .get();

        await Promise.all(
          setsSnap.docs.map(async (setDoc) => {
            const setId = setDoc.id;
            const setName = setDoc.data()?.name as string | undefined;
            const imagesSnap = await adminDb
              .collection('users')
              .doc(uid)
              .collection('galleries')
              .doc(galleryId)
              .collection('sets')
              .doc(setId)
              .collection('images')
              .orderBy('uploadedAt', 'desc')
              .limit(250)
              .get();

            imagesSnap.docs.forEach((imgDoc) => {
              const data = imgDoc.data() || {};
              const url = data.url as string | undefined;
              if (!url) return;

              const uploadedAtValue = data.uploadedAt?.toDate?.()
                ? data.uploadedAt.toDate().toISOString()
                : undefined;

              results.push({
                id: imgDoc.id,
                url,
                name: data.name,
                type: data.type,
                size: data.size,
                path: data.path,
                uploadedAt: uploadedAtValue,
                galleryId,
                galleryName,
                setId,
                setName,
              });
            });
          })
        );
      })
    );

    // Try to provide a best-effort "category" hint in the response (derived from gallery/set names)
    const withCategory = results.map((img) => {
      const label = normalizeCategory(`${img.galleryName || ''} ${img.setName || ''}`);
      const category =
        label.includes('style')
          ? 'style'
          : label.includes('brand')
            ? 'brand'
            : label.includes('character')
              ? 'character'
              : label.includes('product')
                ? 'product'
                : 'other';
      return { ...img, category };
    });

    return res.status(200).json({ images: withCategory });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message || 'Unauthorized' });
  }
}

