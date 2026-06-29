import { z } from "zod";

export const paymentMethodSchema = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "QRIS",
  "EWALLET",
  "CARD",
  "OTHER",
]);

export const paymentStatusSchema = z.enum(["CONFIRMED", "CANCELLED"]);

export const createPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice wajib dipilih."),
  amount: z.coerce.number().positive("Amount harus lebih dari 0."),
  paymentDate: z.string().min(1, "Tanggal payment wajib diisi."),
  method: paymentMethodSchema,
  referenceNumber: z.string().max(120).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updatePaymentSchema = z.object({
  id: z.string().min(1, "Payment ID wajib diisi."),
  amount: z.coerce.number().positive("Amount harus lebih dari 0."),
  paymentDate: z.string().min(1, "Tanggal payment wajib diisi."),
  method: paymentMethodSchema,
  referenceNumber: z.string().max(120).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const paymentIdSchema = z.object({
  id: z.string().min(1, "Payment ID wajib diisi."),
});

export const listPaymentsSchema = z.object({
  invoiceId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  status: paymentStatusSchema.optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type PaymentIdInput = z.infer<typeof paymentIdSchema>;
export type ListPaymentsInput = z.infer<typeof listPaymentsSchema>;
