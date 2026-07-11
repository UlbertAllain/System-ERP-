import { z } from "zod";

export const invoiceStatusSchema = z.enum([
  "DRAFT",
  "ISSUED",
  "PAID",
  "OVERDUE",
  "VOID",
]);

export const invoiceLineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(2, "Deskripsi item minimal 2 karakter.").max(300),
  quantity: z.coerce.number().positive("Quantity harus lebih dari 0."),
  unitPrice: z.coerce.number().min(0, "Harga tidak boleh negatif."),
});

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(2, "Nomor invoice minimal 2 karakter.").max(60),
  clientId: z.string().min(1, "Client wajib dipilih."),
  projectId: z.string().nullable().optional(),
  issueDate: z.string().min(1, "Tanggal invoice wajib diisi."),
  dueDate: z.string().min(1, "Tanggal jatuh tempo wajib diisi."),
  discountAmount: z.coerce
    .number()
    .min(0, "Diskon tidak boleh negatif.")
    .default(0),
  taxAmount: z.coerce.number().min(0, "Pajak tidak boleh negatif.").default(0),
  paidAmount: z.coerce
    .number()
    .min(0, "Paid amount tidak boleh negatif.")
    .default(0),
  notes: z.string().max(1000).nullable().optional(),
  lineItems: z
    .array(invoiceLineItemSchema)
    .min(1, "Invoice wajib punya minimal satu item."),
});

export const updateInvoiceSchema = z.object({
  id: z.string().min(1, "Invoice ID wajib diisi."),
  invoiceNumber: z.string().min(2, "Nomor invoice minimal 2 karakter.").max(60),
  clientId: z.string().min(1, "Client wajib dipilih."),
  projectId: z.string().nullable().optional(),
  issueDate: z.string().min(1, "Tanggal invoice wajib diisi."),
  dueDate: z.string().min(1, "Tanggal jatuh tempo wajib diisi."),
  discountAmount: z.coerce.number().min(0, "Diskon tidak boleh negatif."),
  taxAmount: z.coerce.number().min(0, "Pajak tidak boleh negatif."),
  paidAmount: z.coerce.number().min(0, "Paid amount tidak boleh negatif."),
  notes: z.string().max(1000).nullable().optional(),
  lineItems: z
    .array(invoiceLineItemSchema)
    .min(1, "Invoice wajib punya minimal satu item."),
});

export const invoiceIdSchema = z.object({
  id: z.string().min(1, "Invoice ID wajib diisi."),
});

export const markInvoicePaidSchema = z.object({
  id: z.string().min(1, "Invoice ID wajib diisi."),
  paidAmount: z.coerce.number().min(0, "Paid amount tidak boleh negatif."),
});

export const listInvoicesSchema = z.object({
  search: z.string().trim().max(120).optional(),
  clientId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  status: invoiceStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceIdInput = z.infer<typeof invoiceIdSchema>;
export type MarkInvoicePaidInput = z.infer<typeof markInvoicePaidSchema>;
export type ListInvoicesInput = z.input<typeof listInvoicesSchema>;
