import { z } from "zod";

export const projectStatusSchema = z.enum([
  "PLANNING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]);

export const projectPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const projectBillingTypeSchema = z.enum([
  "FIXED_PRICE",
  "HOURLY",
  "RETAINER",
  "INTERNAL",
]);

export const createProjectSchema = z.object({
  projectCode: z.string().min(2, "Kode project minimal 2 karakter.").max(40),
  name: z.string().min(2, "Nama project minimal 2 karakter.").max(160),
  description: z.string().max(2000).nullable().optional(),
  clientId: z.string().min(1, "Client wajib dipilih."),
  picEmployeeId: z.string().min(1, "PIC project wajib dipilih."),
  priority: projectPrioritySchema.default("MEDIUM"),
  billingType: projectBillingTypeSchema.default("FIXED_PRICE"),
  budget: z.coerce.number().min(0, "Budget tidak boleh negatif.").default(0),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi."),
  endDate: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateProjectSchema = z.object({
  id: z.string().min(1, "Project ID wajib diisi."),
  projectCode: z.string().min(2, "Kode project minimal 2 karakter.").max(40),
  name: z.string().min(2, "Nama project minimal 2 karakter.").max(160),
  description: z.string().max(2000).nullable().optional(),
  clientId: z.string().min(1, "Client wajib dipilih."),
  picEmployeeId: z.string().min(1, "PIC project wajib dipilih."),
  status: projectStatusSchema,
  priority: projectPrioritySchema,
  billingType: projectBillingTypeSchema,
  budget: z.coerce.number().min(0, "Budget tidak boleh negatif."),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi."),
  endDate: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const projectIdSchema = z.object({
  id: z.string().min(1, "Project ID wajib diisi."),
});

export const listProjectsSchema = z.object({
  search: z.string().trim().max(160).optional(),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectIdInput = z.infer<typeof projectIdSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
