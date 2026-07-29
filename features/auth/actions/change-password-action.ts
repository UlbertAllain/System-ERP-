"use server";

import { z } from "zod";

import { securePasswordSchema } from "@/lib/auth/password-policy";
import { getAuditLogDocument } from "@/lib/audit/audit-log";
import {
  clearSessionCookie,
  getCurrentUserFromSession,
  getSessionCookie,
} from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { COLLECTIONS, getDb, serverTimestamp } from "@/lib/firebase/firestore";
import { successResponse, type ActionResponse } from "@/lib/response";

const completePasswordChangeSchema = z
  .object({
    newPassword: securePasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

export type CompletePasswordChangeInput = z.infer<
  typeof completePasswordChangeSchema
>;

export async function completePasswordChangeAction(
  input: CompletePasswordChangeInput,
): Promise<ActionResponse<null>> {
  try {
    const payload = completePasswordChangeSchema.parse(input);
    const currentUser = await getCurrentUserFromSession();

    if (!currentUser) {
      throw new AppError(
        "Session tidak valid. Silakan login ulang.",
        401,
        "UNAUTHENTICATED",
      );
    }

    if (!currentUser.mustChangePassword) {
      throw new AppError(
        "Password akun ini sudah diperbarui.",
        409,
        "PASSWORD_ALREADY_CHANGED",
      );
    }

    const adminAuth = getFirebaseAdminAuth();
    const sessionCookie = await getSessionCookie();

    if (!sessionCookie) {
      throw new AppError(
        "Session tidak valid. Silakan login ulang.",
        401,
        "UNAUTHENTICATED",
      );
    }

    const decodedSession = await adminAuth.verifySessionCookie(
      sessionCookie,
      true,
    );
    const authenticationAgeSeconds =
      Math.floor(Date.now() / 1000) - decodedSession.auth_time;

    if (authenticationAgeSeconds > 15 * 60) {
      await clearSessionCookie();
      throw new AppError(
        "Demi keamanan, silakan login ulang sebelum mengganti password.",
        401,
        "RECENT_AUTHENTICATION_REQUIRED",
      );
    }

    // Password diubah oleh server. Client tidak dapat menonaktifkan flag
    // mustChangePassword hanya dengan mengirim token yang masih valid.
    await adminAuth.updateUser(currentUser.uid, {
      password: payload.newPassword,
    });
    await adminAuth.revokeRefreshTokens(currentUser.uid);

    const db = getDb();
    const userRef = db.collection(COLLECTIONS.users).doc(currentUser.uid);
    const auditLog = getAuditLogDocument({
      user: currentUser,
      action: "CHANGE_PASSWORD_COMPLETED",
      module: "auth",
      entityId: currentUser.uid,
      entityType: "user",
      oldValue: { mustChangePassword: true },
      newValue: { mustChangePassword: false },
    });

    const batch = db.batch();
    batch.update(userRef, {
      mustChangePassword: false,
      updatedAt: serverTimestamp(),
    });
    batch.set(auditLog.ref, auditLog.data);
    await batch.commit();

    await clearSessionCookie();

    return successResponse(
      "Password berhasil diperbarui. Silakan login kembali.",
      null,
    );
  } catch (error) {
    return handleActionError(error);
  }
}
