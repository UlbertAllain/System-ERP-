import { z } from "zod";

export const updateCompanySettingSchema = z.object({
  companyName: z
    .string()
    .min(2, "Nama perusahaan minimal 2 karakter.")
    .max(180),
  legalName: z.string().max(180).nullable().optional(),
  brandName: z.string().max(180).nullable().optional(),

  email: z.string().email("Format email tidak valid.").nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  website: z
    .string()
    .url("Format website harus URL valid.")
    .nullable()
    .optional(),
  address: z.string().max(1000).nullable().optional(),

  taxNumber: z.string().max(80).nullable().optional(),
  bankName: z.string().max(120).nullable().optional(),
  bankAccountName: z.string().max(180).nullable().optional(),
  bankAccountNumber: z.string().max(80).nullable().optional(),

  invoicePrefix: z.string().min(1, "Prefix invoice wajib diisi.").max(20),
  expensePrefix: z.string().min(1, "Prefix expense wajib diisi.").max(20),

  currency: z.string().min(3).max(10),
  timezone: z.string().min(2).max(80),

  invoiceNotes: z.string().max(2000).nullable().optional(),
  paymentInstructions: z.string().max(2000).nullable().optional(),
});

export const updateCompanyLogoSchema = z.object({
  url: z.string().url("URL logo tidak valid."),
  publicId: z.string().min(1, "Public ID logo wajib diisi."),
});

export type UpdateCompanySettingInput = z.infer<
  typeof updateCompanySettingSchema
>;

export type UpdateCompanyLogoInput = z.infer<typeof updateCompanyLogoSchema>;
