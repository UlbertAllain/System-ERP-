import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { getCurrentUserFromSession } from "@/lib/auth/session";
import type { AuthContext } from "@/types/auth";

export async function createSessionAuthContext(): Promise<AuthContext> {
  const user = await getCurrentUserFromSession();

  if (!user) {
    throw new AppError(
      "Session tidak valid. Silakan login ulang.",
      401,
      "UNAUTHENTICATED",
    );
  }

  if (user.mustChangePassword) {
    throw new AppError(
      "User wajib mengganti password terlebih dahulu.",
      403,
      "MUST_CHANGE_PASSWORD",
    );
  }

  return {
    user,
    idToken: "",
  };
}
