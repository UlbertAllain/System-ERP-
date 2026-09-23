import "server-only";

import { randomUUID } from "crypto";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import type { CurrentUser } from "@/types/auth";

export type AuditLogInput = {
  user: CurrentUser | null;
  action: string;
  module: string;
  entityId?: string | null;
  entityType?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function createAuditLogEntry(input: AuditLogInput): {
  id: string;
  data: DocumentData;
} {
  const id = randomUUID();

  return {
    id,
    data: {
      id,
      userId: input.user?.uid ?? null,
      userName: input.user?.name ?? null,
      userEmail: input.user?.email ?? null,
      action: input.action,
      module: input.module,
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      searchText: [
        input.user?.name,
        input.user?.email,
        input.user?.uid,
        input.action,
        input.module,
        input.entityType,
        input.entityId,
      ]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(" ")
        .trim()
        .toLowerCase(),
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: FieldValue.serverTimestamp(),
    },
  };
}

export function getAuditLogDocument(input: AuditLogInput) {
  const entry = createAuditLogEntry(input);

  return {
    ref: getDb().collection(COLLECTIONS.auditLogs).doc(entry.id),
    data: entry.data,
  };
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  const auditLog = getAuditLogDocument(input);

  try {
    await auditLog.ref.set(auditLog.data);
  } catch (error) {
    // Mutation layanan non-kritis tidak boleh dilaporkan gagal hanya karena
    // penulisan audit terpisah gagal. Workflow finansial, proyek, dan user
    // menulis audit dalam transaction/batch yang sama melalui getAuditLogDocument.
    console.error("[audit-log-write-failed]", {
      auditLogId: auditLog.ref.id,
      action: input.action,
      module: input.module,
      entityId: input.entityId ?? null,
      error,
    });
  }
}
