import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type { PaginatedResult } from "@/types/common";
import type {
  ProjectBillingType,
  ProjectDetail,
  ProjectListItem,
  ProjectPriority,
  ProjectStatus,
} from "@/types/project";

export type ListProjectsPaginatedRepositoryParams = {
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  page: number;
  pageSize: number;
};

export function normalizeProjectDocument(
  id: string,
  data: DocumentData,
): ProjectDetail {
  return {
    id,
    projectCode: String(data.projectCode ?? ""),
    name: String(data.name ?? ""),
    description: data.description ?? null,
    clientId: String(data.clientId ?? ""),
    clientName: String(data.clientName ?? ""),
    clientCompany: data.clientCompany ?? null,
    picUserId: data.picUserId ?? null,
    picEmployeeId: data.picEmployeeId ?? null,
    picName: data.picName ?? null,
    status: data.status as ProjectStatus,
    priority: data.priority as ProjectPriority,
    billingType: data.billingType as ProjectBillingType,
    budget: Number(data.budget ?? 0),
    startDate: timestampToDate(data.startDate),
    endDate: timestampToDate(data.endDate),
    thumbnail: data.thumbnail ?? null,
    notes: data.notes ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

export async function findProjectById(
  id: string,
): Promise<ProjectDetail | null> {
  const projectSnap = await getDb()
    .collection(COLLECTIONS.projects)
    .doc(id)
    .get();

  if (!projectSnap.exists) {
    return null;
  }

  return normalizeProjectDocument(projectSnap.id, projectSnap.data() ?? {});
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.projects)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeProjectDocument(doc.id, doc.data()))
    .filter((project) => project.deletedAt === null);
}

export async function listProjectsPaginated({
  search,
  status,
  priority,
  page,
  pageSize,
}: ListProjectsPaginatedRepositoryParams): Promise<
  PaginatedResult<ProjectListItem>
> {
  const normalizedSearch = search?.trim().toLowerCase();
  const collection = getDb().collection(COLLECTIONS.projects);
  const offset = (page - 1) * pageSize;

  if (normalizedSearch) {
    const querySnap = await collection
      .orderBy("searchText")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .get();

    const matchedProjects = querySnap.docs
      .map((doc) => normalizeProjectDocument(doc.id, doc.data()))
      .filter((project) => project.deletedAt === null)
      .filter((project) => (status ? project.status === status : true))
      .filter((project) => (priority ? project.priority === priority : true));

    const totalItems = matchedProjects.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items: matchedProjects.slice(offset, offset + pageSize),
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

  if (priority) {
    baseQuery = baseQuery.where("priority", "==", priority);
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
      normalizeProjectDocument(doc.id, doc.data()),
    ),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}
