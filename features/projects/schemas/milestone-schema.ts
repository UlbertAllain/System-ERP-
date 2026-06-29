import { z } from "zod";

export const milestoneStatusSchema = z.enum([
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
]);

export const createMilestoneSchema = z.object({
  projectId: z.string().min(1, "Project ID wajib diisi."),
  title: z.string().min(2, "Judul milestone minimal 2 karakter.").max(160),
  description: z.string().max(2000).nullable().optional(),
  order: z.coerce
    .number()
    .int()
    .min(0, "Urutan tidak boleh negatif.")
    .default(0),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const updateMilestoneSchema = z.object({
  id: z.string().min(1, "Milestone ID wajib diisi."),
  title: z.string().min(2, "Judul milestone minimal 2 karakter.").max(160),
  description: z.string().max(2000).nullable().optional(),
  status: milestoneStatusSchema,
  order: z.coerce.number().int().min(0, "Urutan tidak boleh negatif."),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const milestoneIdSchema = z.object({
  id: z.string().min(1, "Milestone ID wajib diisi."),
});

export const listMilestonesSchema = z.object({
  projectId: z.string().min(1, "Project ID wajib diisi.").optional(),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type MilestoneIdInput = z.infer<typeof milestoneIdSchema>;
export type ListMilestonesInput = z.infer<typeof listMilestonesSchema>;
