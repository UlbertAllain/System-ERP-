import "server-only";

import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { getAuditLogDocument } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import type { PaginatedResult } from "@/types/common";
import type { CurrentUser } from "@/types/auth";
import type {
  TaskDetail,
  TaskListItem,
  TaskPriority,
  TaskStatus,
} from "@/types/task";

import {
  normalizeNullableString,
  normalizeSearchText,
  dateStringToTimestamp,
} from "@/lib/domain/firestore-value";
import {
  assertValidTaskDateRange,
  assertValidTaskStatusTransition,
} from "@/modules/projects/tasks/task-domain";
import {
  findTaskById,
  listTasks,
  listTasksPaginated,
  normalizeTaskDocument,
} from "@/features/projects/repositories/task-repository";
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

function normalizeProjectSnapshotOrThrow(
  projectSnap: DocumentSnapshot<DocumentData>,
): ProjectSnapshot {
  if (!projectSnap.exists) {
    throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
  }

  const project = projectSnap.data() ?? {};

  if (project.deletedAt) {
    throw new AppError("Project sudah dihapus.", 400, "PROJECT_DELETED");
  }

  if (["COMPLETED", "CANCELLED", "ARCHIVED"].includes(String(project.status ?? ""))) {
    throw new AppError("Project sudah berada pada status terminal dan tidak dapat diubah.",
      409,
      "PROJECT_NOT_MUTABLE");
  }

  return {
    id: projectSnap.id,
    name: String(project.name ?? ""),
    projectCode: String(project.projectCode ?? ""),
  };
}

function normalizeMilestoneSnapshotOrThrow(
  milestoneSnap: DocumentSnapshot<DocumentData>,
  projectId: string,
): MilestoneSnapshot {
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

  if (String(milestone.projectId ?? "") !== projectId) {
    throw new AppError(
      "Milestone tidak berada dalam project yang sama.",
      400,
      "MILESTONE_PROJECT_MISMATCH",
    );
  }

  if (["COMPLETED", "CANCELLED"].includes(String(milestone.status ?? ""))) {
    throw new AppError(
      "Task tidak dapat ditempatkan pada milestone yang sudah selesai atau dibatalkan.",
      409,
      "MILESTONE_TERMINAL",
    );
  }

  return {
    id: milestoneSnap.id,
    projectId,
    title: String(milestone.title ?? ""),
  };
}

function normalizeEmployeeSnapshotOrThrow(
  employeeSnap: DocumentSnapshot<DocumentData>,
): EmployeeSnapshot {
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

async function getTaskDocumentOrThrow(id: string): Promise<TaskDetail> {
  const task = await findTaskById(id);

  if (!task) {
    throw new AppError("Task tidak ditemukan.", 404, "TASK_NOT_FOUND");
  }

  return task;
}

export async function listTasksService(
  input: ListTasksParams = {},
): Promise<TaskListItem[]> {
  return listTasks(input);
}

export async function listTasksPaginatedService(
  input: ListTasksPaginatedParams,
): Promise<PaginatedResult<TaskListItem>> {
  return listTasksPaginated(input);
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

  const db = getDb();
  const taskId = createDocumentId("tasks");
  const taskRef = db.collection(COLLECTIONS.tasks).doc(taskId);
  const projectRef = db.collection(COLLECTIONS.projects).doc(projectId);
  const milestoneRef = milestoneId
    ? db.collection(COLLECTIONS.milestones).doc(milestoneId)
    : null;
  const employeeRef = assigneeEmployeeId
    ? db.collection(COLLECTIONS.employees).doc(assigneeEmployeeId)
    : null;
  const memberQuery = assigneeEmployeeId
    ? db
        .collection(COLLECTIONS.projectMembers)
        .where("projectId", "==", projectId)
        .where("employeeId", "==", assigneeEmployeeId)
        .where("status", "==", "ACTIVE")
        .limit(1)
    : null;
  const taskTitle = title.trim();

  await db.runTransaction(async (transaction) => {
    const [projectSnap, milestoneSnap, employeeSnap, memberSnap] =
      await Promise.all([
        transaction.get(projectRef),
        milestoneRef ? transaction.get(milestoneRef) : Promise.resolve(null),
        employeeRef ? transaction.get(employeeRef) : Promise.resolve(null),
        memberQuery ? transaction.get(memberQuery) : Promise.resolve(null),
      ]);

    const project = normalizeProjectSnapshotOrThrow(projectSnap);
    const milestone = milestoneSnap
      ? normalizeMilestoneSnapshotOrThrow(milestoneSnap, project.id)
      : null;
    const assignee = employeeSnap
      ? normalizeEmployeeSnapshotOrThrow(employeeSnap)
      : null;

    if (assignee && (!memberSnap || memberSnap.empty)) {
      throw new AppError(
        "Assignee harus active member di project tersebut.",
        400,
        "ASSIGNEE_NOT_PROJECT_MEMBER",
      );
    }

    const auditLog = getAuditLogDocument({
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

    transaction.set(taskRef, {
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
    transaction.set(auditLog.ref, auditLog.data);
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
  assertValidTaskDateRange(startDate, dueDate);

  const db = getDb();
  const taskRef = db.collection(COLLECTIONS.tasks).doc(id);
  const taskTitle = title.trim();

  await db.runTransaction(async (transaction) => {
    const taskSnap = await transaction.get(taskRef);

    if (!taskSnap.exists) {
      throw new AppError("Task tidak ditemukan.", 404, "TASK_NOT_FOUND");
    }

    const oldTask = normalizeTaskDocument(taskSnap.id, taskSnap.data() ?? {});

    if (oldTask.deletedAt) {
      throw new AppError("Task sudah dihapus.", 404, "TASK_DELETED");
    }

    assertValidTaskStatusTransition(oldTask.status, status);

    const projectRef = db
      .collection(COLLECTIONS.projects)
      .doc(oldTask.projectId);
    const milestoneRef = milestoneId
      ? db.collection(COLLECTIONS.milestones).doc(milestoneId)
      : null;
    const employeeRef = assigneeEmployeeId
      ? db.collection(COLLECTIONS.employees).doc(assigneeEmployeeId)
      : null;
    const memberQuery = assigneeEmployeeId
      ? db
          .collection(COLLECTIONS.projectMembers)
          .where("projectId", "==", oldTask.projectId)
          .where("employeeId", "==", assigneeEmployeeId)
          .where("status", "==", "ACTIVE")
          .limit(1)
      : null;

    const [projectSnap, milestoneSnap, employeeSnap, memberSnap] =
      await Promise.all([
        transaction.get(projectRef),
        milestoneRef ? transaction.get(milestoneRef) : Promise.resolve(null),
        employeeRef ? transaction.get(employeeRef) : Promise.resolve(null),
        memberQuery ? transaction.get(memberQuery) : Promise.resolve(null),
      ]);

    const project = normalizeProjectSnapshotOrThrow(projectSnap);
    const milestone = milestoneSnap
      ? normalizeMilestoneSnapshotOrThrow(milestoneSnap, project.id)
      : null;
    const assignee = employeeSnap
      ? normalizeEmployeeSnapshotOrThrow(employeeSnap)
      : null;

    if (assignee && (!memberSnap || memberSnap.empty)) {
      throw new AppError(
        "Assignee harus active member di project tersebut.",
        400,
        "ASSIGNEE_NOT_PROJECT_MEMBER",
      );
    }

    const oldData = taskSnap.data() ?? {};
    const completedAt =
      status === "DONE" ? (oldData.completedAt ?? serverTimestamp()) : null;
    const auditLog = getAuditLogDocument({
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
        completedAt:
          status === "DONE" ? "SERVER_TIMESTAMP_OR_EXISTING" : null,
      },
    });

    transaction.update(taskRef, {
      projectName: project.name,
      projectCode: project.projectCode,
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
        project.projectCode,
        project.name,
        milestone?.title,
        assignee?.fullName,
      ),
      startDate: dateStringToTimestamp(startDate),
      dueDate: dateStringToTimestamp(dueDate),
      completedAt,
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getTaskByIdService(id);
}

export async function deleteTaskService({
  actor,
  id,
}: TaskIdParams): Promise<TaskDetail> {
  const db = getDb();
  const taskRef = db.collection(COLLECTIONS.tasks).doc(id);
  const deletedTask = await db.runTransaction(async (transaction) => {
    const taskSnap = await transaction.get(taskRef);

    if (!taskSnap.exists) {
      throw new AppError("Task tidak ditemukan.", 404, "TASK_NOT_FOUND");
    }

    const oldTask = normalizeTaskDocument(taskSnap.id, taskSnap.data() ?? {});

    if (oldTask.deletedAt) {
      throw new AppError("Task sudah dihapus.", 404, "TASK_DELETED");
    }

    if (!["TODO", "CANCELLED"].includes(oldTask.status)) {
      throw new AppError(
        "Hanya task berstatus TODO atau CANCELLED yang dapat dihapus.",
        409,
        "TASK_DELETE_BLOCKED",
      );
    }

    const projectRef = db
      .collection(COLLECTIONS.projects)
      .doc(oldTask.projectId);
    const projectSnap = await transaction.get(projectRef);
    normalizeProjectSnapshotOrThrow(projectSnap);

    const auditLog = getAuditLogDocument({
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

    transaction.update(taskRef, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);

    return oldTask;
  });

  return {
    ...deletedTask,
    deletedAt: new Date(),
  };
}
