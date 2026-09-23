import { z } from "zod";

import {
  ALL_PERMISSION_SLUGS,
  ROLES,
  type PermissionSlug,
  type RoleSlug,
} from "@/constants/permissions";

const roleSlugs = ROLES.map((role) => role.slug) as [RoleSlug, ...RoleSlug[]];

const permissionSlugs = ALL_PERMISSION_SLUGS as [
  PermissionSlug,
  ...PermissionSlug[],
];

export const listRolesSchema = z.object({});

export const listPermissionsSchema = z.object({});

export const getRolePermissionEditorDataSchema = z.object({});

export const updateRolePermissionsSchema = z.object({
  roleSlug: z.enum(roleSlugs),
  permissionSlugs: z.array(z.enum(permissionSlugs)),
});

export type ListRolesInput = z.infer<typeof listRolesSchema>;
export type ListPermissionsInput = z.infer<typeof listPermissionsSchema>;
export type GetRolePermissionEditorDataInput = z.infer<
  typeof getRolePermissionEditorDataSchema
>;
export type UpdateRolePermissionsInput = z.infer<
  typeof updateRolePermissionsSchema
>;
