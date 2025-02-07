import * as admin from 'firebase-admin';

// Initialize Firebase Admin with your service account
const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

async function setUserAsAdmin(uid: string) {
  try {
    const db = admin.firestore();
    await db.collection('users').doc(uid).update({
      isAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Successfully set user ${uid} as admin`);
  } catch (error) {
    console.error('Error setting admin:', error);
  } finally {
    await app.delete();
  }
}

// Get the UID from command line arguments
const uid = process.argv[2];
if (!uid) {
  console.error('Please provide a user ID as an argument');
  process.exit(1);
}

setUserAsAdmin(uid);