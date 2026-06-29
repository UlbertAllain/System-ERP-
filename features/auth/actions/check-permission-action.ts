"use server";

import { z } from "zod";

import type { PermissionSlug } from "@/constants/permissions";
import { createAuthContext } from "@/lib/auth/auth-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";

const checkPermissionSchema = z.object({
  idToken: z.string().min(1, "ID token wajib diisi."),
  permission: z.string().min(1, "Permission wajib diisi."),
});

export async function checkPermissionAction(
  input: z.infer<typeof checkPermissionSchema>,
): Promise<ActionResponse<{ allowed: true }>> {
  try {
    const payload = checkPermissionSchema.parse(input);

    const auth = await createAuthContext(payload.idToken);

    requirePermission(auth.user, payload.permission as PermissionSlug);

    return successResponse("Permission valid.", {
      allowed: true,
    });
  } catch (error) {
    return handleActionError(error);
  }
}
