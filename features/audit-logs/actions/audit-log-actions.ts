"use server";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { AuditLogDetail, AuditLogListItem } from "@/types/audit-log";
import {
  getAuditLogByIdService,
  listAuditLogsService,
} from "@/features/audit-logs/services/audit-log-service";
import {
  auditLogIdSchema,
  listAuditLogsSchema,
  type AuditLogIdInput,
  type ListAuditLogsInput,
} from "@/features/audit-logs/schemas/audit-log-schema";

export async function listAuditLogsAction(
  input: ListAuditLogsInput = {
    limit: 0,
  },
): Promise<ActionResponse<AuditLogListItem[]>> {
  try {
    const payload = listAuditLogsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "audit_log.read");

    const auditLogs = await listAuditLogsService({
      module: payload.module,
      action: payload.action,
      userId: payload.userId,
      limit: payload.limit,
    });

    return successResponse("Audit logs berhasil dimuat.", auditLogs);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getAuditLogByIdAction(
  input: AuditLogIdInput,
): Promise<ActionResponse<AuditLogDetail>> {
  try {
    const payload = auditLogIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "audit_log.read");

    const auditLog = await getAuditLogByIdService(payload.id);

    return successResponse("Audit log berhasil dimuat.", auditLog);
  } catch (error) {
    return handleActionError(error);
  }
}
