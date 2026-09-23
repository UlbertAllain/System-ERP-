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
  idempotencyKey: z.string().uuid("Idempotency key tidak valid."),
  invoiceId: z.string().min(1, "Invoice wajib dipilih."),
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
  search: z.string().trim().max(120).optional(),
  invoiceId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  method: paymentMethodSchema.optional(),
  status: paymentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentIdInput = z.infer<typeof paymentIdSchema>;
export type ListPaymentsInput = z.input<typeof listPaymentsSchema>;
