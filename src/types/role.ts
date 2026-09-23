import type { PermissionSlug, RoleSlug } from "@/constants/permissions";

export type PermissionListItem = {
  id: string;
  name: string;
  slug: PermissionSlug;
  module: string;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type RoleListItem = {
  id: string;
  name: string;
  slug: RoleSlug;
  description: string | null;
  isSystem: boolean;
  permissionIds: string[];
  permissionSlugs: PermissionSlug[];
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type RolePermissionEditorData = {
  roles: RoleListItem[];
  permissions: PermissionListItem[];
};
