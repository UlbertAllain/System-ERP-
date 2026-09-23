"use server";

import { z } from "zod";

import { AUTH_COOKIE } from "@/constants/auth";
import { createAuthContext } from "@/lib/auth/auth-context";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { CurrentUser } from "@/types/auth";

const createSessionSchema = z.object({
  idToken: z.string().min(1, "ID token wajib diisi."),
});

export async function createSessionAction(
  input: z.infer<typeof createSessionSchema>,
): Promise<ActionResponse<{ user: CurrentUser }>> {
  try {
    const payload = createSessionSchema.parse(input);

    const auth = await createAuthContext(payload.idToken);

    const expiresIn = AUTH_COOKIE.maxAge * 1000;

    const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(
      payload.idToken,
      {
        expiresIn,
      },
    );

    await setSessionCookie(sessionCookie);

    return successResponse("Session berhasil dibuat.", {
      user: auth.user,
    });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function clearSessionAction(): Promise<ActionResponse<null>> {
  try {
    await clearSessionCookie();

    return successResponse("Session berhasil dihapus.", null);
  } catch (error) {
    return handleActionError(error);
  }
}
