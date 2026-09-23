import { z } from "zod";

export const listTaskCommentsSchema = z.object({
  taskId: z.string().min(1, "Task ID wajib diisi."),
});

export const createTaskCommentSchema = z.object({
  taskId: z.string().min(1, "Task ID wajib diisi."),
  body: z
    .string()
    .trim()
    .min(2, "Komentar minimal 2 karakter.")
    .max(2000, "Komentar maksimal 2000 karakter."),
});

export const updateTaskCommentSchema = z.object({
  id: z.string().min(1, "Comment ID wajib diisi."),
  body: z
    .string()
    .trim()
    .min(2, "Komentar minimal 2 karakter.")
    .max(2000, "Komentar maksimal 2000 karakter."),
});

export const taskCommentIdSchema = z.object({
  id: z.string().min(1, "Comment ID wajib diisi."),
});

export type ListTaskCommentsInput = z.infer<typeof listTaskCommentsSchema>;
export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>;
export type UpdateTaskCommentInput = z.infer<typeof updateTaskCommentSchema>;
export type TaskCommentIdInput = z.infer<typeof taskCommentIdSchema>;
