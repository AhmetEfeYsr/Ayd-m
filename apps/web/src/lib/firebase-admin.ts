import * as admin from 'firebase-admin';

const getFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin configuration keys are missing. ' +
      'Please check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  // Handle newline characters in private key
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (err) {
    console.warn(
      'Firebase Admin credential initialization failed. ' +
      'Falling back to basic project ID initialization (expected during builds with placeholder keys).'
    );
    admin.initializeApp({
      projectId,
    });
  }

  return admin;
};

export const firebaseAdmin = getFirebaseAdmin();
export const firebaseAuth = firebaseAdmin.auth();
