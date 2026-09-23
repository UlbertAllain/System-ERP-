import "server-only";

import { redirect } from "next/navigation";

import type { PermissionSlug } from "@/constants/permissions";
import { getCurrentUserFromSession } from "@/lib/auth/session";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "@/lib/permissions/guard";
import type { CurrentUser } from "@/types/auth";

export async function requireAuthenticatedPage(): Promise<CurrentUser> {
  const currentUser = await getCurrentUserFromSession();

  if (!currentUser) {
    redirect("/login");
    throw new Error("UNREACHABLE");
  }

  if (currentUser.mustChangePassword) {
    redirect("/change-password");
  }

  return currentUser;
}

export async function requirePagePermission(
  permission: PermissionSlug,
): Promise<CurrentUser> {
  const currentUser = await requireAuthenticatedPage();

  if (!hasPermission(currentUser, permission)) {
    redirect("/403");
  }

  return currentUser;
}

export async function requireAnyPagePermission(
  permissions: PermissionSlug[],
): Promise<CurrentUser> {
  const currentUser = await requireAuthenticatedPage();

  if (!hasAnyPermission(currentUser, permissions)) {
    redirect("/403");
  }

  return currentUser;
}

export async function requireAllPagePermissions(
  permissions: PermissionSlug[],
): Promise<CurrentUser> {
  const currentUser = await requireAuthenticatedPage();

  if (!hasAllPermissions(currentUser, permissions)) {
    redirect("/403");
  }

  return currentUser;
}
