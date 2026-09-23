import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type { UserStatus } from "@/types/auth";
import type { PaginatedResult } from "@/types/common";
import type { UserDetail, UserListItem } from "@/types/user";
import type { RoleSlug } from "@/constants/permissions";

export type ListUsersPaginatedRepositoryParams = {
  search?: string;
  status?: UserStatus;
  roleSlug?: RoleSlug;
  page: number;
  pageSize: number;
};

export function normalizeUserDocument(
  uid: string,
  data: DocumentData,
): UserDetail {
  return {
    uid,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    avatar: data.avatar ?? null,
    status: data.status as UserStatus,
    mustChangePassword: Boolean(data.mustChangePassword),
    employeeId: data.employeeId ?? null,
    roleIds: Array.isArray(data.roleIds) ? data.roleIds : [],
    roleSlugs: Array.isArray(data.roleSlugs) ? data.roleSlugs : [],
    permissionsCache: Array.isArray(data.permissionsCache)
      ? data.permissionsCache
      : [],
    lastLoginAt: timestampToDate(data.lastLoginAt),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

function shouldUseFallbackQuery(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : null;
  const message = "message" in error ? String(error.message) : "";

  return (
    code === 9 ||
    code === "failed-precondition" ||
    message.toLowerCase().includes("index")
  );
}

function userMatchesListFilters(
  user: UserListItem,
  params: Pick<
    ListUsersPaginatedRepositoryParams,
    "search" | "status" | "roleSlug"
  >,
) {
  if (params.status && user.status !== params.status) return false;
  if (params.roleSlug && !user.roleSlugs.includes(params.roleSlug)) return false;

  const normalizedSearch = params.search?.trim().toLowerCase();

  if (normalizedSearch) {
    return [user.name, user.email, user.status, ...user.roleSlugs]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  }

  return true;
}

function paginateUsers(
  users: UserListItem[],
  page: number,
  pageSize: number,
): PaginatedResult<UserListItem> {
  const totalItems = users.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const offset = (page - 1) * pageSize;

  return {
    items: users.slice(offset, offset + pageSize),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}

export async function findUserById(uid: string): Promise<UserDetail | null> {
  const snap = await getDb().collection(COLLECTIONS.users).doc(uid).get();

  if (!snap.exists) {
    return null;
  }

  return normalizeUserDocument(snap.id, snap.data() ?? {});
}

export async function listUsers(): Promise<UserListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.users)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeUserDocument(doc.id, doc.data()))
    .filter((user) => user.deletedAt === null);
}

export async function listUsersPaginated({
  search,
  status,
  roleSlug,
  page,
  pageSize,
}: ListUsersPaginatedRepositoryParams): Promise<
  PaginatedResult<UserListItem>
> {
  const normalizedSearch = search?.trim().toLowerCase();
  const collection = getDb().collection(COLLECTIONS.users);
  const offset = (page - 1) * pageSize;

  if (normalizedSearch) {
    const querySnap = await collection
      .orderBy("searchText")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .get();

    const matchedUsers = querySnap.docs
      .map((doc) => normalizeUserDocument(doc.id, doc.data()))
      .filter((user) => user.deletedAt === null)
      .filter((user) => (status ? user.status === status : true))
      .filter((user) => (roleSlug ? user.roleSlugs.includes(roleSlug) : true));

    const totalItems = matchedUsers.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items: matchedUsers.slice(offset, offset + pageSize),
      totalItems,
      page,
      pageSize,
      totalPages,
    };
  }

  let baseQuery: FirebaseFirestore.Query = collection.where(
    "deletedAt",
    "==",
    null,
  );

  if (status) {
    baseQuery = baseQuery.where("status", "==", status);
  }

  if (roleSlug) {
    baseQuery = baseQuery.where("roleSlugs", "array-contains", roleSlug);
  }

  try {
    const countSnap = await baseQuery.count().get();
    const totalItems = countSnap.data().count;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
    const querySnap = await baseQuery
      .orderBy("createdAt", "desc")
      .offset(offset)
      .limit(pageSize)
      .get();

    return {
      items: querySnap.docs.map((doc) =>
        normalizeUserDocument(doc.id, doc.data()),
      ),
      totalItems,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    if (!shouldUseFallbackQuery(error)) {
      throw error;
    }

    const users = (await listUsers()).filter((user) =>
      userMatchesListFilters(user, { search, status, roleSlug }),
    );

    return paginateUsers(users, page, pageSize);
  }
}
