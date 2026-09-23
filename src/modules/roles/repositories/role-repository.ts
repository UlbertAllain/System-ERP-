import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  PermissionListItem,
  RoleListItem,
} from "@/types/role";
import type { PermissionSlug, RoleSlug } from "@/constants/permissions";

export function normalizePermissionDocument(
  id: string,
  data: DocumentData,
): PermissionListItem {
  return {
    id,
    name: String(data.name ?? ""),
    slug: data.slug as PermissionSlug,
    module: String(data.module ?? ""),
    description: data.description ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function normalizeRoleDocument(
  id: string,
  data: DocumentData,
): RoleListItem {
  return {
    id,
    name: String(data.name ?? ""),
    slug: data.slug as RoleSlug,
    description: data.description ?? null,
    isSystem: Boolean(data.isSystem),
    permissionIds: Array.isArray(data.permissionIds) ? data.permissionIds : [],
    permissionSlugs: Array.isArray(data.permissionSlugs)
      ? data.permissionSlugs
      : [],
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export async function listPermissions(): Promise<PermissionListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.permissions)
    .orderBy("module", "asc")
    .orderBy("slug", "asc")
    .get();

  return querySnap.docs.map((doc) =>
    normalizePermissionDocument(doc.id, doc.data()),
  );
}

export async function listRoles(): Promise<RoleListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.roles)
    .orderBy("name", "asc")
    .get();

  return querySnap.docs.map((doc) =>
    normalizeRoleDocument(doc.id, doc.data()),
  );
}
