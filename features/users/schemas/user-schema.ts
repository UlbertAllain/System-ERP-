import { z } from "zod";

import { ROLES, type RoleSlug } from "@/constants/permissions";

const roleSlugs = ROLES.map((role) => role.slug) as [RoleSlug, ...RoleSlug[]];

export const createUserSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter.").max(120),
  email: z.string().email("Email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  roleSlugs: z.array(z.enum(roleSlugs)).min(1, "Minimal pilih satu role."),
  mustChangePassword: z.boolean().default(true),
});

export const updateUserProfileSchema = z.object({
  uid: z.string().min(1, "UID wajib diisi."),
  name: z.string().min(2, "Nama minimal 2 karakter.").max(120),
  email: z.string().email("Email tidak valid."),
});

export const updateUserStatusSchema = z.object({
  uid: z.string().min(1, "UID wajib diisi."),
});

export const updateUserRolesSchema = z.object({
  uid: z.string().min(1, "UID wajib diisi."),
  roleSlugs: z.array(z.enum(roleSlugs)).min(1, "Minimal pilih satu role."),
});

export const getUserByIdSchema = z.object({
  uid: z.string().min(1, "UID wajib diisi."),
});

export const listUsersSchema = z.object({});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
