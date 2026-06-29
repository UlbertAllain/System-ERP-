import type { PermissionSlug } from "@/constants/permissions";
import type { ImageAsset } from "@/types/common";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type AppUser = {
  uid: string;
  name: string;
  email: string;
  avatar: ImageAsset | null;
  status: UserStatus;
  mustChangePassword: boolean;
  employeeId: string | null;
  roleIds: string[];
  roleSlugs: string[];
  permissionsCache: PermissionSlug[];
  lastLoginAt: Date | null;
};

export type CurrentUser = {
  uid: string;
  name: string;
  email: string;
  avatar: ImageAsset | null;
  status: UserStatus;
  employeeId: string | null;
  roleIds: string[];
  roleSlugs: string[];
  permissions: PermissionSlug[];
  mustChangePassword: boolean;
};

export type AuthContext = {
  user: CurrentUser;
  idToken: string;
};
