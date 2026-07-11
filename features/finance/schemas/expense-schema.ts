import { z } from "zod";

export const expenseStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "PAID",
]);

export const expenseCategorySchema = z.enum([
  "OPERATIONAL",
  "SOFTWARE",
  "HARDWARE",
  "MARKETING",
  "TRANSPORT",
  "MEAL",
  "SALARY",
  "TAX",
  "OTHER",
]);

export const createExpenseSchema = z.object({
  expenseNumber: z.string().min(2, "Nomor expense minimal 2 karakter.").max(60),
  title: z.string().min(2, "Judul expense minimal 2 karakter.").max(180),
  description: z.string().max(2000).nullable().optional(),
  category: expenseCategorySchema,
  projectId: z.string().nullable().optional(),
  vendorName: z.string().max(180).nullable().optional(),
  amount: z.coerce.number().positive("Amount harus lebih dari 0."),
  expenseDate: z.string().min(1, "Tanggal expense wajib diisi."),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateExpenseSchema = z.object({
  id: z.string().min(1, "Expense ID wajib diisi."),
  expenseNumber: z.string().min(2, "Nomor expense minimal 2 karakter.").max(60),
  title: z.string().min(2, "Judul expense minimal 2 karakter.").max(180),
  description: z.string().max(2000).nullable().optional(),
  category: expenseCategorySchema,
  projectId: z.string().nullable().optional(),
  vendorName: z.string().max(180).nullable().optional(),
  amount: z.coerce.number().positive("Amount harus lebih dari 0."),
  expenseDate: z.string().min(1, "Tanggal expense wajib diisi."),
  notes: z.string().max(1000).nullable().optional(),
});

export const expenseIdSchema = z.object({
  id: z.string().min(1, "Expense ID wajib diisi."),
});

export const rejectExpenseSchema = z.object({
  id: z.string().min(1, "Expense ID wajib diisi."),
  reason: z.string().min(2, "Alasan reject wajib diisi.").max(1000),
});

export const listExpensesSchema = z.object({
  search: z.string().trim().max(120).optional(),
  projectId: z.string().min(1).optional(),
  status: expenseStatusSchema.optional(),
  category: expenseCategorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseIdInput = z.infer<typeof expenseIdSchema>;
export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;
export type ListExpensesInput = z.input<typeof listExpensesSchema>;
