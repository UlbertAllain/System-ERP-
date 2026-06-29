import "server-only";

import type { PermissionSlug } from "@/constants/permissions";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/types/auth";

export function hasPermission(
  user: CurrentUser,
  permission: PermissionSlug,
): boolean {
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: CurrentUser,
  permissions: PermissionSlug[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(
  user: CurrentUser,
  permissions: PermissionSlug[],
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function requirePermission(
  user: CurrentUser,
  permission: PermissionSlug,
): void {
  if (!hasPermission(user, permission)) {
    throw new AppError(
      `Akses ditolak. Permission dibutuhkan: ${permission}`,
      403,
      "FORBIDDEN",
    );
  }
}

export function requireAnyPermission(
  user: CurrentUser,
  permissions: PermissionSlug[],
): void {
  if (!hasAnyPermission(user, permissions)) {
    throw new AppError(
      `Akses ditolak. Salah satu permission dibutuhkan: ${permissions.join(
        ", ",
      )}`,
      403,
      "FORBIDDEN",
    );
  }
}

export function requireAllPermissions(
  user: CurrentUser,
  permissions: PermissionSlug[],
): void {
  if (!hasAllPermissions(user, permissions)) {
    throw new AppError(
      `Akses ditolak. Semua permission dibutuhkan: ${permissions.join(", ")}`,
      403,
      "FORBIDDEN",
    );
  }
}
