import "server-only";

import { COLLECTIONS, getDb, serverTimestamp } from "@/lib/firebase/firestore";
import { AppError } from "@/lib/errors/app-error";
import { getAuditLogDocument } from "@/lib/audit/audit-log";
import type { CurrentUser } from "@/types/auth";
import type {
  PermissionListItem,
  RoleListItem,
  RolePermissionEditorData,
} from "@/types/role";
import type { PermissionSlug, RoleSlug } from "@/constants/permissions";
import {
  listPermissions,
  listRoles,
  normalizeRoleDocument,
} from "@/features/roles/repositories/role-repository";

type UpdateRolePermissionsParams = {
  actor: CurrentUser;
  roleSlug: RoleSlug;
  permissionSlugs: PermissionSlug[];
};

function getPermissionIdFromSlug(slug: string): string {
  return slug.replace(/\./g, "_");
}

export async function listPermissionsService(): Promise<PermissionListItem[]> {
  return listPermissions();
}

export async function listRolesService(): Promise<RoleListItem[]> {
  return listRoles();
}

export async function getRolePermissionEditorDataService(): Promise<RolePermissionEditorData> {
  const [roles, permissions] = await Promise.all([
    listRolesService(),
    listPermissionsService(),
  ]);

  return {
    roles,
    permissions,
  };
}

export async function updateRolePermissionsService({
  actor,
  roleSlug,
  permissionSlugs,
}: UpdateRolePermissionsParams): Promise<RoleListItem> {
  if (roleSlug === "super_admin") {
    throw new AppError(
      "Permission role super_admin tidak boleh diubah.",
      400,
      "SUPER_ADMIN_ROLE_LOCKED",
    );
  }

  const db = getDb();
  const roleRef = db.collection(COLLECTIONS.roles).doc(roleSlug);
  const roleSnap = await roleRef.get();

  if (!roleSnap.exists) {
    throw new AppError("Role tidak ditemukan.", 404, "ROLE_NOT_FOUND");
  }

  const oldRole = normalizeRoleDocument(roleSnap.id, roleSnap.data() ?? {});
  const uniquePermissionSlugs = Array.from(new Set(permissionSlugs)).sort();
  const permissionIds = uniquePermissionSlugs.map(getPermissionIdFromSlug);

  const invalidPermissionIds: string[] = [];

  const permissionSnaps = await Promise.all(
    permissionIds.map((permissionId) =>
      db.collection(COLLECTIONS.permissions).doc(permissionId).get(),
    ),
  );

  permissionSnaps.forEach((snap) => {
    if (!snap.exists) {
      invalidPermissionIds.push(snap.id);
    }
  });

  if (invalidPermissionIds.length > 0) {
    throw new AppError(
      `Permission tidak valid: ${invalidPermissionIds.join(", ")}`,
      400,
      "INVALID_PERMISSION",
    );
  }

  const auditLog = getAuditLogDocument({
    user: actor,
    action: "ROLE_PERMISSIONS_UPDATED",
    module: "role",
    entityId: roleSlug,
    entityType: "role",
    oldValue: {
      permissionSlugs: oldRole.permissionSlugs,
    },
    newValue: {
      permissionSlugs: uniquePermissionSlugs,
    },
  });

  await db.runTransaction(async (transaction) => {
    const freshRoleSnap = await transaction.get(roleRef);

    if (!freshRoleSnap.exists) {
      throw new AppError("Role tidak ditemukan.", 404, "ROLE_NOT_FOUND");
    }

    transaction.update(roleRef, {
      permissionIds,
      permissionSlugs: uniquePermissionSlugs,
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  // Runtime authorization membaca role langsung. Cache user hanya turunan dan
  // kegagalan rebuild tidak boleh membatalkan perubahan role yang sudah aman.
  try {
    await rebuildUsersPermissionCacheByRole(roleSlug);
  } catch (error) {
    console.error("[role-permission-cache-rebuild]", error);
  }

  const updatedRoleSnap = await roleRef.get();

  return normalizeRoleDocument(
    updatedRoleSnap.id,
    updatedRoleSnap.data() ?? {},
  );
}

async function rebuildUsersPermissionCacheByRole(
  changedRoleSlug: RoleSlug,
): Promise<void> {
  const db = getDb();

  const usersSnap = await db
    .collection(COLLECTIONS.users)
    .where("roleSlugs", "array-contains", changedRoleSlug)
    .get();

  if (usersSnap.empty) {
    return;
  }

  const allRolesSnap = await db.collection(COLLECTIONS.roles).get();

  const rolePermissionMap = new Map<RoleSlug, PermissionSlug[]>();

  allRolesSnap.docs.forEach((doc) => {
    const data = doc.data();

    rolePermissionMap.set(data.slug as RoleSlug, data.permissionSlugs ?? []);
  });

  const batch = db.batch();

  usersSnap.docs.forEach((userDoc) => {
    const userData = userDoc.data();
    const roleSlugs = Array.isArray(userData.roleSlugs)
      ? (userData.roleSlugs as RoleSlug[])
      : [];

    const permissionSet = new Set<PermissionSlug>();

    roleSlugs.forEach((roleSlug) => {
      const permissions = rolePermissionMap.get(roleSlug) ?? [];

      permissions.forEach((permission) => {
        permissionSet.add(permission);
      });
    });

    batch.update(userDoc.ref, {
      permissionsCache: Array.from(permissionSet).sort(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
