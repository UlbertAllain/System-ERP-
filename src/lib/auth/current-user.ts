import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { AppError } from "@/lib/errors/app-error";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { verifyFirebaseIdToken } from "@/lib/auth/verify-token";
import type { AppUser, CurrentUser } from "@/types/auth";
import { ALL_PERMISSION_SLUGS, type PermissionSlug } from "@/constants/permissions";

function normalizeFirestoreUser(uid: string, data: DocumentData): AppUser {
  return {
    uid,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    avatar: data.avatar ?? null,
    status: data.status,
    mustChangePassword: Boolean(data.mustChangePassword),
    employeeId: data.employeeId ?? null,
    roleIds: Array.isArray(data.roleIds) ? data.roleIds : [],
    roleSlugs: Array.isArray(data.roleSlugs) ? data.roleSlugs : [],
    permissionsCache: Array.isArray(data.permissionsCache)
      ? data.permissionsCache
      : [],
    lastLoginAt: data.lastLoginAt?.toDate?.() ?? null,
  };
}

function isPermissionSlug(value: unknown): value is PermissionSlug {
  return (
    typeof value === "string" &&
    (ALL_PERMISSION_SLUGS as readonly string[]).includes(value)
  );
}

async function resolvePermissionsForRoles(
  roleSlugs: string[],
): Promise<PermissionSlug[]> {
  if (roleSlugs.includes("super_admin")) {
    return [...ALL_PERMISSION_SLUGS].sort();
  }

  const db = getDb();
  const uniqueRoleSlugs = Array.from(new Set(roleSlugs.filter(Boolean)));

  if (uniqueRoleSlugs.length === 0) {
    return [];
  }

  const roleRefs = uniqueRoleSlugs.map((roleSlug) =>
    db.collection(COLLECTIONS.roles).doc(roleSlug),
  );
  const roleSnaps = await db.getAll(...roleRefs);
  const permissionSet = new Set<PermissionSlug>();

  for (const roleSnap of roleSnaps) {
    if (!roleSnap.exists) {
      console.warn(`[auth] Role tidak ditemukan: ${roleSnap.id}`);
      continue;
    }

    const permissionSlugs = roleSnap.data()?.permissionSlugs;

    if (!Array.isArray(permissionSlugs)) {
      continue;
    }

    for (const permissionSlug of permissionSlugs) {
      if (isPermissionSlug(permissionSlug)) {
        permissionSet.add(permissionSlug);
      }
    }
  }

  return Array.from(permissionSet).sort();
}

function toCurrentUser(
  appUser: AppUser,
  permissions: PermissionSlug[],
): CurrentUser {
  return {
    uid: appUser.uid,
    name: appUser.name,
    email: appUser.email,
    avatar: appUser.avatar,
    status: appUser.status,
    employeeId: appUser.employeeId,
    roleIds: appUser.roleIds,
    roleSlugs: appUser.roleSlugs,
    permissions,
    mustChangePassword: appUser.mustChangePassword,
  };
}

async function getCurrentUserByUid(uid: string): Promise<CurrentUser> {
  const userSnap = await getDb().collection(COLLECTIONS.users).doc(uid).get();

  if (!userSnap.exists) {
    throw new AppError(
      "User profile tidak ditemukan di Firestore.",
      401,
      "USER_PROFILE_NOT_FOUND",
    );
  }

  const user = normalizeFirestoreUser(uid, userSnap.data() ?? {});

  if (user.status !== "ACTIVE") {
    throw new AppError(
      "User tidak aktif atau sedang ditangguhkan.",
      403,
      "USER_NOT_ACTIVE",
    );
  }

  if (!user.email) {
    throw new AppError("Email user tidak valid.", 401, "INVALID_USER_EMAIL");
  }

  const permissions = await resolvePermissionsForRoles(user.roleSlugs);

  return toCurrentUser(user, permissions);
}

export async function getCurrentUserFromIdToken(
  idToken: string,
): Promise<CurrentUser> {
  const verifiedToken = await verifyFirebaseIdToken(idToken);

  return getCurrentUserByUid(verifiedToken.uid);
}

export async function getCurrentUserFromSessionCookie(
  sessionCookie: string,
): Promise<CurrentUser> {
  if (!sessionCookie) {
    throw new AppError("Session tidak ditemukan.", 401, "SESSION_NOT_FOUND");
  }

  let decodedToken: DecodedIdToken;

  try {
    decodedToken = await getFirebaseAdminAuth().verifySessionCookie(
      sessionCookie,
      true,
    );
  } catch {
    throw new AppError(
      "Session tidak valid atau sudah kedaluwarsa.",
      401,
      "INVALID_SESSION",
    );
  }

  return getCurrentUserByUid(decodedToken.uid);
}
