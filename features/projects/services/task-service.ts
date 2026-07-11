import "server-only";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import type { PaginatedResult } from "@/types/common";
import type { CurrentUser } from "@/types/auth";
import type {
  TaskDetail,
  TaskListItem,
  TaskPriority,
  TaskStatus,
} from "@/types/task";

type CreateTaskParams = {
  actor: CurrentUser;
  projectId: string;
  milestoneId?: string | null;
  assigneeEmployeeId?: string | null;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  order: number;
  startDate?: string | null;
  dueDate?: string | null;
};

type UpdateTaskParams = {
  actor: CurrentUser;
  id: string;
  milestoneId?: string | null;
  assigneeEmployeeId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  startDate?: string | null;
  dueDate?: string | null;
};

type TaskIdParams = {
  actor: CurrentUser;
  id: string;
};

type ListTasksParams = {
  projectId?: string;
  milestoneId?: string;
  assigneeEmployeeId?: string;
};

type ListTasksPaginatedParams = ListTasksParams & {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  page: number;
  pageSize: number;
};

type ProjectSnapshot = {
  id: string;
  name: string;
  projectCode: string;
};

type MilestoneSnapshot = {
  id: string;
  projectId: string;
  title: string;
};

type EmployeeSnapshot = {
  id: string;
  fullName: string;
  userId: string | null;
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

function normalizeNullableString(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function normalizeSearchText(...values: Array<string | null | undefined>): string {
  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim()
    .toLowerCase();
}

function dateStringToTimestamp(
  value: string | null | undefined,
): Timestamp | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  return Timestamp.fromDate(date);
}

function assertValidTaskDateRange(
  startDate?: string | null,
  dueDate?: string | null,
): void {
  if (!startDate || !dueDate) {
    return;
  }

  const start = new Date(startDate);
  const due = new Date(dueDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  if (due.getTime() < start.getTime()) {
    throw new AppError(
      "Due date tidak boleh sebelum start date.",
      400,
      "INVALID_TASK_DATE_RANGE",
    );
  }
}

function normalizeTaskDocument(id: string, data: DocumentData): TaskListItem {
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

async function getProjectSnapshotOrThrow(
  projectId: string,
): Promise<ProjectSnapshot> {
  const projectSnap = await getDb()
    .collection(COLLECTIONS.projects)
    .doc(projectId)
    .get();

  if (!projectSnap.exists) {
    throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
  }

  const project = projectSnap.data() ?? {};

  if (project.deletedAt) {
    throw new AppError("Project sudah dihapus.", 400, "PROJECT_DELETED");
  }

  if (project.status === "ARCHIVED") {
    throw new AppError("Project sudah diarsipkan.", 400, "PROJECT_ARCHIVED");
  }

  return {
    id: projectSnap.id,
    name: String(project.name ?? ""),
    projectCode: String(project.projectCode ?? ""),
  };
}

async function getMilestoneSnapshotOrThrow(
  milestoneId: string,
): Promise<MilestoneSnapshot> {
  const milestoneSnap = await getDb()
    .collection(COLLECTIONS.milestones)
    .doc(milestoneId)
    .get();

  if (!milestoneSnap.exists) {
    throw new AppError(
      "Milestone tidak ditemukan.",
      404,
      "MILESTONE_NOT_FOUND",
    );
  }

  const milestone = milestoneSnap.data() ?? {};

  if (milestone.deletedAt) {
    throw new AppError("Milestone sudah dihapus.", 400, "MILESTONE_DELETED");
  }

  return {
    id: milestoneSnap.id,
    projectId: String(milestone.projectId ?? ""),
    title: String(milestone.title ?? ""),
  };
}

async function getEmployeeSnapshotOrThrow(
  employeeId: string,
): Promise<EmployeeSnapshot> {
  const employeeSnap = await getDb()
    .collection(COLLECTIONS.employees)
    .doc(employeeId)
    .get();

  if (!employeeSnap.exists) {
    throw new AppError("Employee tidak ditemukan.", 404, "EMPLOYEE_NOT_FOUND");
  }

  const employee = employeeSnap.data() ?? {};

  if (employee.deletedAt) {
    throw new AppError("Employee sudah dihapus.", 400, "EMPLOYEE_DELETED");
  }

  if (employee.status !== "ACTIVE") {
    throw new AppError(
      "Assignee harus employee dengan status ACTIVE.",
      400,
      "ASSIGNEE_NOT_ACTIVE",
    );
  }

  return {
    id: employeeSnap.id,
    fullName: String(employee.fullName ?? ""),
    userId: employee.userId ?? null,
  };
}

async function assertAssigneeIsProjectMember(
  projectId: string,
  employeeId: string,
): Promise<void> {
  const memberSnap = await getDb()
    .collection(COLLECTIONS.projectMembers)
    .where("projectId", "==", projectId)
    .where("employeeId", "==", employeeId)
    .where("status", "==", "ACTIVE")
    .limit(1)
    .get();

  if (memberSnap.empty) {
    throw new AppError(
      "Assignee harus active member di project tersebut.",
      400,
      "ASSIGNEE_NOT_PROJECT_MEMBER",
    );
  }
}

async function getTaskDocumentOrThrow(id: string): Promise<TaskDetail> {
  const taskSnap = await getDb().collection(COLLECTIONS.tasks).doc(id).get();

  if (!taskSnap.exists) {
    throw new AppError("Task tidak ditemukan.", 404, "TASK_NOT_FOUND");
  }

  return normalizeTaskDocument(taskSnap.id, taskSnap.data() ?? {});
}

async function resolveMilestoneForProject(
  projectId: string,
  milestoneId?: string | null,
): Promise<MilestoneSnapshot | null> {
  if (!milestoneId) {
    return null;
  }

  const milestone = await getMilestoneSnapshotOrThrow(milestoneId);

  if (milestone.projectId !== projectId) {
    throw new AppError(
      "Milestone tidak berada dalam project yang sama.",
      400,
      "MILESTONE_PROJECT_MISMATCH",
    );
  }

  return milestone;
}

async function resolveAssigneeForProject(
  projectId: string,
  assigneeEmployeeId?: string | null,
): Promise<EmployeeSnapshot | null> {
  if (!assigneeEmployeeId) {
    return null;
  }

  const employee = await getEmployeeSnapshotOrThrow(assigneeEmployeeId);

  await assertAssigneeIsProjectMember(projectId, employee.id);

  return employee;
}

export async function listTasksService({
  projectId,
  milestoneId,
  assigneeEmployeeId,
}: ListTasksParams = {}): Promise<TaskListItem[]> {
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

export async function listTasksPaginatedService({
  projectId,
  milestoneId,
  assigneeEmployeeId,
  search,
  status,
  priority,
  page,
  pageSize,
}: ListTasksPaginatedParams): Promise<PaginatedResult<TaskListItem>> {
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

export async function getTaskByIdService(id: string): Promise<TaskDetail> {
  const task = await getTaskDocumentOrThrow(id);

  if (task.deletedAt) {
    throw new AppError("Task sudah dihapus.", 404, "TASK_DELETED");
  }

  return task;
}

export async function createTaskService({
  actor,
  projectId,
  milestoneId,
  assigneeEmployeeId,
  title,
  description,
  priority,
  order,
  startDate,
  dueDate,
}: CreateTaskParams): Promise<TaskDetail> {
  assertValidTaskDateRange(startDate, dueDate);

  const project = await getProjectSnapshotOrThrow(projectId);

  const [milestone, assignee] = await Promise.all([
    resolveMilestoneForProject(project.id, milestoneId),
    resolveAssigneeForProject(project.id, assigneeEmployeeId),
  ]);

  const taskId = createDocumentId("tasks");
  const taskTitle = title.trim();

  await getDb()
    .collection(COLLECTIONS.tasks)
    .doc(taskId)
    .set({
      id: taskId,

      projectId: project.id,
      projectName: project.name,
      projectCode: project.projectCode,

      milestoneId: milestone?.id ?? null,
      milestoneTitle: milestone?.title ?? null,

      assigneeEmployeeId: assignee?.id ?? null,
      assigneeName: assignee?.fullName ?? null,
      assigneeUserId: assignee?.userId ?? null,

      title: taskTitle,
      description: normalizeNullableString(description),
      status: "TODO",
      priority,
      order,
      searchText: normalizeSearchText(
        taskTitle,
        project.projectCode,
        project.name,
        milestone?.title,
        assignee?.fullName,
      ),

      startDate: dateStringToTimestamp(startDate),
      dueDate: dateStringToTimestamp(dueDate),
      completedAt: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });

  await writeAuditLog({
    user: actor,
    action: "TASK_CREATED",
    module: "task",
    entityId: taskId,
    entityType: "task",
    oldValue: null,
    newValue: {
      id: taskId,
      projectId: project.id,
      projectName: project.name,
      milestoneId: milestone?.id ?? null,
      assigneeEmployeeId: assignee?.id ?? null,
      title: taskTitle,
      status: "TODO",
      priority,
      order,
    },
  });

  return getTaskByIdService(taskId);
}

export async function updateTaskService({
  actor,
  id,
  milestoneId,
  assigneeEmployeeId,
  title,
  description,
  status,
  priority,
  order,
  startDate,
  dueDate,
}: UpdateTaskParams): Promise<TaskDetail> {
  const oldTask = await getTaskByIdService(id);

  assertValidTaskDateRange(startDate, dueDate);

  const [milestone, assignee] = await Promise.all([
    resolveMilestoneForProject(oldTask.projectId, milestoneId),
    resolveAssigneeForProject(oldTask.projectId, assigneeEmployeeId),
  ]);

  const completedAt =
    status === "DONE" ? (oldTask.completedAt ?? serverTimestamp()) : null;

  const taskTitle = title.trim();

  await getDb()
    .collection(COLLECTIONS.tasks)
    .doc(id)
    .update({
      milestoneId: milestone?.id ?? null,
      milestoneTitle: milestone?.title ?? null,

      assigneeEmployeeId: assignee?.id ?? null,
      assigneeName: assignee?.fullName ?? null,
      assigneeUserId: assignee?.userId ?? null,

      title: taskTitle,
      description: normalizeNullableString(description),
      status,
      priority,
      order,
      searchText: normalizeSearchText(
        taskTitle,
        oldTask.projectCode,
        oldTask.projectName,
        milestone?.title,
        assignee?.fullName,
      ),

      startDate: dateStringToTimestamp(startDate),
      dueDate: dateStringToTimestamp(dueDate),
      completedAt,

      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "TASK_UPDATED",
    module: "task",
    entityId: id,
    entityType: "task",
    oldValue: {
      milestoneId: oldTask.milestoneId,
      assigneeEmployeeId: oldTask.assigneeEmployeeId,
      title: oldTask.title,
      status: oldTask.status,
      priority: oldTask.priority,
      order: oldTask.order,
      completedAt: oldTask.completedAt,
    },
    newValue: {
      milestoneId: milestone?.id ?? null,
      assigneeEmployeeId: assignee?.id ?? null,
      title: taskTitle,
      status,
      priority,
      order,
      completedAt: status === "DONE" ? "SERVER_TIMESTAMP_OR_EXISTING" : null,
    },
  });

  return getTaskByIdService(id);
}

export async function deleteTaskService({
  actor,
  id,
}: TaskIdParams): Promise<TaskDetail> {
  const oldTask = await getTaskByIdService(id);

  await getDb().collection(COLLECTIONS.tasks).doc(id).update({
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "TASK_DELETED",
    module: "task",
    entityId: id,
    entityType: "task",
    oldValue: {
      title: oldTask.title,
      status: oldTask.status,
      deletedAt: oldTask.deletedAt,
    },
    newValue: {
      deletedAt: "SERVER_TIMESTAMP",
    },
  });

  return {
    ...oldTask,
    deletedAt: new Date(),
  };
}
