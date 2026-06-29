import { z } from "zod";

export const listAuditLogsSchema = z.object({
  module: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const auditLogIdSchema = z.object({
  id: z.string().min(1, "Audit log ID wajib diisi."),
});

export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>;
export type AuditLogIdInput = z.infer<typeof auditLogIdSchema>;
