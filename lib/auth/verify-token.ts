import "server-only";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export type VerifiedAuthToken = {
  uid: string;
  email: string | null;
};

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedAuthToken> {
  if (!idToken) {
    throw new Error("Firebase ID token is required.");
  }

  const decodedToken = await getFirebaseAdminAuth().verifyIdToken(idToken);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email ?? null,
  };
}
