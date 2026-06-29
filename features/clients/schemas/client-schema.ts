import { z } from "zod";

export const clientStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export const createClientSchema = z.object({
  name: z.string().min(2, "Nama client minimal 2 karakter.").max(120),
  email: z.string().email("Email client tidak valid."),
  phone: z.string().max(30).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  website: z.string().url("Website tidak valid.").nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateClientSchema = z.object({
  id: z.string().min(1, "Client ID wajib diisi."),
  name: z.string().min(2, "Nama client minimal 2 karakter.").max(120),
  email: z.string().email("Email client tidak valid."),
  phone: z.string().max(30).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  website: z.string().url("Website tidak valid.").nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  status: clientStatusSchema,
  notes: z.string().max(1000).nullable().optional(),
});

export const clientIdSchema = z.object({
  id: z.string().min(1, "Client ID wajib diisi."),
});

export const listClientsSchema = z.object({});
export const updateClientLogoSchema = z.object({
  id: z.string().min(1, "Client ID wajib diisi."),
  logo: z.object({
    url: z.string().url("URL logo tidak valid."),
    publicId: z.string().min(1, "Cloudinary publicId wajib diisi."),
  }),
});
export type UpdateClientLogoInput = z.infer<typeof updateClientLogoSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientIdInput = z.infer<typeof clientIdSchema>;
export type ListClientsInput = z.infer<typeof listClientsSchema>;
