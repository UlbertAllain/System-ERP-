"use server";

import { createAuthContext } from "@/lib/auth/auth-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { CurrentUser } from "@/types/auth";

export async function getCurrentUserAction(
  idToken: string,
): Promise<ActionResponse<CurrentUser>> {
  try {
    const auth = await createAuthContext(idToken);

    return successResponse("Current user berhasil dimuat.", auth.user);
  } catch (error) {
    return handleActionError(error);
  }
}
