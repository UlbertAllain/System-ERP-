import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type { PaginatedResult } from "@/types/common";
import type {
  TaskDetail,
  TaskListItem,
  TaskPriority,
  TaskStatus,
} from "@/types/task";

export type ListTasksRepositoryParams = {
  projectId?: string;
  milestoneId?: string;
  assigneeEmployeeId?: string;
};

export type ListTasksPaginatedRepositoryParams = ListTasksRepositoryParams & {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  page: number;
  pageSize: number;
};

export function normalizeTaskDocument(
  id: string,
  data: DocumentData,
): TaskDetail {
  return {
    id,
    projectId: String(data.projectId ?? ""),
    projectName: String(data.projectName ?? ""),
    projectCode: String(data.projectCode ?? ""),
    milestoneId: data.milestoneId ?? null,
    milestoneTitle: data.milestoneTitle ?? null,
    assigneeEmployeeId: data.assigneeEmployeeId ?? null,
    assigneeName: data.assigneeName ?? null,
    assigneeUserId: data.assigneeUserId ?? null,
    title: String(data.title ?? ""),
    description: data.description ?? null,
    status: data.status as TaskStatus,
    priority: data.priority as TaskPriority,
    order: Number(data.order ?? 0),
    startDate: timestampToDate(data.startDate),
    dueDate: timestampToDate(data.dueDate),
    completedAt: timestampToDate(data.completedAt),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

export async function findTaskById(id: string): Promise<TaskDetail | null> {
  const taskSnap = await getDb().collection(COLLECTIONS.tasks).doc(id).get();

  if (!taskSnap.exists) {
    return null;
  }

  return normalizeTaskDocument(taskSnap.id, taskSnap.data() ?? {});
}

export async function listTasks(
  {
    projectId,
    milestoneId,
    assigneeEmployeeId,
  }: ListTasksRepositoryParams = {},
): Promise<TaskListItem[]> {
  const baseQuery = getDb().collection(COLLECTIONS.tasks);

  let querySnap;

  if (projectId) {
    querySnap = await baseQuery.where("projectId", "==", projectId).get();
  } else if (milestoneId) {
    querySnap = await baseQuery.where("milestoneId", "==", milestoneId).get();
  } else if (assigneeEmployeeId) {
    querySnap = await baseQuery
      .where("assigneeEmployeeId", "==", assigneeEmployeeId)
      .get();
  } else {
    querySnap = await baseQuery.get();
  }

  return querySnap.docs
    .map((doc) => normalizeTaskDocument(doc.id, doc.data()))
    .filter((task) => task.deletedAt === null)
    .filter((task) => {
      if (projectId && task.projectId !== projectId) return false;
      if (milestoneId && task.milestoneId !== milestoneId) return false;
      if (
        assigneeEmployeeId &&
        task.assigneeEmployeeId !== assigneeEmployeeId
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (a.projectCode === b.projectCode) {
        return a.order - b.order;
      }

      return a.projectCode.localeCompare(b.projectCode);
    });
}

export async function listTasksPaginated({
  projectId,
  milestoneId,
  assigneeEmployeeId,
  search,
  status,
  priority,
  page,
  pageSize,
}: ListTasksPaginatedRepositoryParams): Promise<PaginatedResult<TaskListItem>> {
  const normalizedSearch = search?.trim().toLowerCase();
  const collection = getDb().collection(COLLECTIONS.tasks);
  const offset = (page - 1) * pageSize;

  if (normalizedSearch) {
    const querySnap = await collection
      .orderBy("searchText")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .get();

    const matchedTasks = querySnap.docs
      .map((doc) => normalizeTaskDocument(doc.id, doc.data()))
      .filter((task) => task.deletedAt === null)
      .filter((task) => (projectId ? task.projectId === projectId : true))
      .filter((task) => (milestoneId ? task.milestoneId === milestoneId : true))
      .filter((task) =>
        assigneeEmployeeId
          ? task.assigneeEmployeeId === assigneeEmployeeId
          : true,
      )
      .filter((task) => (status ? task.status === status : true))
      .filter((task) => (priority ? task.priority === priority : true));

    const totalItems = matchedTasks.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items: matchedTasks.slice(offset, offset + pageSize),
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

  if (projectId) {
    baseQuery = baseQuery.where("projectId", "==", projectId);
  }
  if (milestoneId) {
    baseQuery = baseQuery.where("milestoneId", "==", milestoneId);
  }
  if (assigneeEmployeeId) {
    baseQuery = baseQuery.where("assigneeEmployeeId", "==", assigneeEmployeeId);
  }
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
      normalizeTaskDocument(doc.id, doc.data()),
    ),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}
