import "server-only";

import type { DocumentData, Query } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { AppError } from "@/lib/errors/app-error";
import type { PaginatedResult } from "@/types/common";
import type { AuditLogDetail, AuditLogListItem } from "@/types/audit-log";

type ListAuditLogsParams = {
  search?: string;
  module?: string;
  action?: string;
  userId?: string;
  limit?: number;
};

type ListAuditLogsPaginatedParams = ListAuditLogsParams & {
  page: number;
  pageSize: number;
};

function timestampToDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  return null;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAuditLogDocument(
  id: string,
  data: DocumentData,
): AuditLogDetail {
  return {
    id,

    userId: String(data.userId ?? data.uid ?? ""),
    userName: String(data.userName ?? data.name ?? "Unknown user"),
    userEmail: normalizeNullableString(data.userEmail ?? data.email),

    action: String(data.action ?? ""),
    module: String(data.module ?? ""),

    entityId: normalizeNullableString(data.entityId),
    entityType: normalizeNullableString(data.entityType),

    oldValue: data.oldValue ?? null,
    newValue: data.newValue ?? null,

    createdAt: timestampToDate(data.createdAt),
  };
}

function filterAuditLogs(
  auditLogs: AuditLogListItem[],
  params: ListAuditLogsParams,
) {
  return auditLogs.filter((log) => {
    if (params.module && log.module !== params.module) {
      return false;
    }

    if (params.action && log.action !== params.action) {
      return false;
    }

    if (params.userId && log.userId !== params.userId) {
      return false;
    }

    if (params.search) {
      const keyword = params.search.trim().toLowerCase();
      const haystack = [
        log.userName,
        log.userEmail,
        log.userId,
        log.action,
        log.module,
        log.entityType,
        log.entityId,
      ]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });
}

function sortAuditLogsByCreatedAtDesc(auditLogs: AuditLogListItem[]) {
  return [...auditLogs].sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;

    return bTime - aTime;
  });
}

async function getAuditLogsWithOrderedQuery(
  params: ListAuditLogsParams,
): Promise<AuditLogListItem[]> {
  const safeLimit = params.limit ?? 100;

  const query: Query<DocumentData> = getDb()
    .collection(COLLECTIONS.auditLogs)
    .orderBy("createdAt", "desc")
    .limit(safeLimit);

  const querySnap = await query.get();

  const auditLogs = querySnap.docs.map((doc) =>
    normalizeAuditLogDocument(doc.id, doc.data()),
  );

  return filterAuditLogs(auditLogs, params);
}

async function getAuditLogsWithFallbackQuery(
  params: ListAuditLogsParams,
): Promise<AuditLogListItem[]> {
  const safeLimit = params.limit ?? 100;

  const querySnap = await getDb()
    .collection(COLLECTIONS.auditLogs)
    .limit(safeLimit)
    .get();

  const auditLogs = querySnap.docs.map((doc) =>
    normalizeAuditLogDocument(doc.id, doc.data()),
  );

  return filterAuditLogs(sortAuditLogsByCreatedAtDesc(auditLogs), params);
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

export async function listAuditLogsService({
  search,
  module,
  action,
  userId,
  limit = 100,
}: ListAuditLogsParams = {}): Promise<AuditLogListItem[]> {
  const params: ListAuditLogsParams = {
    search,
    module,
    action,
    userId,
    limit,
  };

  try {
    return await getAuditLogsWithOrderedQuery(params);
  } catch (error) {
    if (shouldUseFallbackQuery(error)) {
      return getAuditLogsWithFallbackQuery(params);
    }

    throw error;
  }
}

export async function listAuditLogsPaginatedService({
  search,
  module,
  action,
  userId,
  page,
  pageSize,
}: ListAuditLogsPaginatedParams): Promise<PaginatedResult<AuditLogListItem>> {
  const normalizedSearch = search?.trim().toLowerCase();
  const collection = getDb().collection(COLLECTIONS.auditLogs);
  const offset = (page - 1) * pageSize;

  if (normalizedSearch) {
    const querySnap = await collection
      .orderBy("searchText")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .get();

    const matchedLogs = filterAuditLogs(
      querySnap.docs.map((doc) => normalizeAuditLogDocument(doc.id, doc.data())),
      { search, module, action, userId },
    );
    const totalItems = matchedLogs.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items: matchedLogs.slice(offset, offset + pageSize),
      totalItems,
      page,
      pageSize,
      totalPages,
    };
  }

  let baseQuery: Query<DocumentData> = collection;

  if (module) {
    baseQuery = baseQuery.where("module", "==", module);
  }

  if (action) {
    baseQuery = baseQuery.where("action", "==", action);
  }

  if (userId) {
    baseQuery = baseQuery.where("userId", "==", userId);
  }

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
      normalizeAuditLogDocument(doc.id, doc.data()),
    ),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}

export async function getAuditLogByIdService(
  id: string,
): Promise<AuditLogDetail> {
  const auditLogSnap = await getDb()
    .collection(COLLECTIONS.auditLogs)
    .doc(id)
    .get();

  if (!auditLogSnap.exists) {
    throw new AppError(
      "Audit log tidak ditemukan.",
      404,
      "AUDIT_LOG_NOT_FOUND",
    );
  }

  return normalizeAuditLogDocument(auditLogSnap.id, auditLogSnap.data() ?? {});
}
