//lib/firebase-admin.ts
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Get environment variables
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin credentials. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local');
    }

    // Parse private key according to Firebase docs
    // The key should have literal \n that need to be converted to actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Create service account object as per Firebase Admin SDK docs
    const serviceAccount: admin.ServiceAccount = {
      projectId,
      clientEmail,
      privateKey
    };

    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...(storageBucket ? { storageBucket } : {})
    });

    console.log('✓ Firebase Admin initialized successfully');
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();
const adminStorage = admin.storage();
const defaultBucket = (() => {
  try {
    return adminStorage.bucket();
  } catch {
    return undefined as any;
  }
})();

export { adminDb, adminAuth, adminStorage, defaultBucket };