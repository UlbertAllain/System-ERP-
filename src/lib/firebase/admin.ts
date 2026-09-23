import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;

function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function formatPrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: formatPrivateKey(getRequiredEnv("FIREBASE_PRIVATE_KEY")),
    }),
  });

  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  if (adminAuth) {
    return adminAuth;
  }

  adminAuth = getAuth(getFirebaseAdminApp());

  return adminAuth;
}

export function getFirebaseAdminFirestore(): Firestore {
  if (adminFirestore) {
    return adminFirestore;
  }

  adminFirestore = getFirestore(getFirebaseAdminApp());

  adminFirestore.settings({
    ignoreUndefinedProperties: true,
  });

  return adminFirestore;
}
