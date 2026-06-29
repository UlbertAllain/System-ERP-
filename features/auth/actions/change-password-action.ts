"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAuthContext } from "@/lib/auth/auth-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { COLLECTIONS, getDb, serverTimestamp } from "@/lib/firebase/firestore";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { successResponse, type ActionResponse } from "@/lib/response";

const completePasswordChangeSchema = z.object({
  idToken: z.string().min(1, "ID token wajib diisi."),
});

export async function completePasswordChangeAction(
  input: z.infer<typeof completePasswordChangeSchema>,
): Promise<ActionResponse<null>> {
  try {
    const payload = completePasswordChangeSchema.parse(input);

    const auth = await createAuthContext(payload.idToken);

    await getDb().collection(COLLECTIONS.users).doc(auth.user.uid).update({
      mustChangePassword: false,
      updatedAt: serverTimestamp(),
    });

    await writeAuditLog({
      user: auth.user,
      action: "CHANGE_PASSWORD_COMPLETED",
      module: "auth",
      entityId: auth.user.uid,
      entityType: "user",
      oldValue: {
        mustChangePassword: true,
      },
      newValue: {
        mustChangePassword: false,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/change-password");

    return successResponse("Password berhasil diperbarui.", null);
  } catch (error) {
    return handleActionError(error);
  }
}
