import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function validateFirebaseClientConfig() {
  const missingKeys = Object.entries(firebaseClientConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase client environment variables: ${missingKeys.join(", ")}`,
    );
  }
}

export function getFirebaseClientApp(): FirebaseApp {
  validateFirebaseClientConfig();

  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp(firebaseClientConfig);
}

export function getFirebaseClientAuth(): Auth {
  return getAuth(getFirebaseClientApp());
}
