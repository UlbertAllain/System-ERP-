import { z } from "zod";

export const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
  "CANCELLED",
]);

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "Project ID wajib diisi."),
  milestoneId: z.string().nullable().optional(),
  assigneeEmployeeId: z.string().nullable().optional(),
  title: z.string().min(2, "Judul task minimal 2 karakter.").max(180),
  description: z.string().max(3000).nullable().optional(),
  priority: taskPrioritySchema.default("MEDIUM"),
  order: z.coerce
    .number()
    .int()
    .min(0, "Urutan tidak boleh negatif.")
    .default(0),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, "Task ID wajib diisi."),
  milestoneId: z.string().nullable().optional(),
  assigneeEmployeeId: z.string().nullable().optional(),
  title: z.string().min(2, "Judul task minimal 2 karakter.").max(180),
  description: z.string().max(3000).nullable().optional(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  order: z.coerce.number().int().min(0, "Urutan tidak boleh negatif."),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const taskIdSchema = z.object({
  id: z.string().min(1, "Task ID wajib diisi."),
});

export const listTasksSchema = z.object({
  projectId: z.string().min(1, "Project ID wajib diisi.").optional(),
  milestoneId: z.string().min(1, "Milestone ID wajib diisi.").optional(),
  assigneeEmployeeId: z.string().min(1, "Employee ID wajib diisi.").optional(),
  search: z.string().trim().max(180).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskIdInput = z.infer<typeof taskIdSchema>;
export type ListTasksInput = z.infer<typeof listTasksSchema>;
