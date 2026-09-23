import { z } from "zod";

export const listAuditLogsSchema = z.object({
  search: z.string().trim().max(120).optional(),
  module: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const auditLogIdSchema = z.object({
  id: z.string().min(1, "Audit log ID wajib diisi."),
});

export type ListAuditLogsInput = z.input<typeof listAuditLogsSchema>;
export type AuditLogIdInput = z.infer<typeof auditLogIdSchema>;
