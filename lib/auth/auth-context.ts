import "server-only";

import { getCurrentUserFromIdToken } from "@/lib/auth/current-user";
import type { AuthContext } from "@/types/auth";

export async function createAuthContext(idToken: string): Promise<AuthContext> {
  const user = await getCurrentUserFromIdToken(idToken);

  return {
    user,
    idToken,
  };
}
