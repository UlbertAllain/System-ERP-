import type { PermissionSlug, RoleSlug } from "@/constants/permissions";
import type { ImageAsset } from "@/types/common";
import type { UserStatus } from "@/types/auth";

export type UserListItem = {
  uid: string;
  name: string;
  email: string;
  avatar: ImageAsset | null;
  status: UserStatus;
  mustChangePassword: boolean;
  employeeId: string | null;
  roleIds: RoleSlug[];
  roleSlugs: RoleSlug[];
  permissionsCache: PermissionSlug[];
  lastLoginAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type UserDetail = UserListItem;
