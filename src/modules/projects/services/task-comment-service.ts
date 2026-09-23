import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { getAuditLogDocument } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/types/auth";
import type {
  TaskCommentDetail,
  TaskCommentListItem,
} from "@/types/task-comment";
import type { TaskDetail } from "@/types/task";
import { getTaskByIdService } from "@/modules/projects/services/task-service";
import { timestampToDate } from "@/lib/domain/firestore-value";
import {
  findTaskCommentById,
  listTaskComments,
  normalizeTaskCommentDocument,
} from "@/modules/projects/repositories/task-comment-repository";

type CreateTaskCommentParams = {
  actor: CurrentUser;
  taskId: string;
  body: string;
};

type UpdateTaskCommentParams = {
  actor: CurrentUser;
  id: string;
  body: string;
};

type TaskCommentIdParams = {
  actor: CurrentUser;
  id: string;
  canDeleteAny: boolean;
};

function normalizeTaskForCommentOrThrow(
  id: string,
  data: DocumentData | undefined,
): TaskDetail {
  if (!data) {
    throw new AppError("Task tidak ditemukan.", 404, "TASK_NOT_FOUND");
  }

  const task: TaskDetail = {
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
    status: data.status,
    priority: data.priority,
    order: Number(data.order ?? 0),
    startDate: timestampToDate(data.startDate),
    dueDate: timestampToDate(data.dueDate),
    completedAt: timestampToDate(data.completedAt),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };

  if (task.deletedAt) {
    throw new AppError("Task sudah dihapus.", 404, "TASK_DELETED");
  }

  return task;
}

function normalizeCommentOrThrow(
  id: string,
  data: DocumentData | undefined,
): TaskCommentDetail {
  if (!data) {
    throw new AppError(
      "Komentar task tidak ditemukan.",
      404,
      "TASK_COMMENT_NOT_FOUND",
    );
  }

  const comment = normalizeTaskCommentDocument(id, data);

  if (comment.deletedAt) {
    throw new AppError(
      "Komentar task sudah dihapus.",
      404,
      "TASK_COMMENT_DELETED",
    );
  }

  return comment;
}

export async function listTaskCommentsService(
  taskId: string,
): Promise<TaskCommentListItem[]> {
  return listTaskComments(taskId);
}

export async function getTaskCommentByIdService(
  id: string,
): Promise<TaskCommentDetail> {
  const comment = await findTaskCommentById(id);

  if (!comment || comment.deletedAt) {
    throw new AppError(
      "Komentar task tidak ditemukan.",
      404,
      "TASK_COMMENT_NOT_FOUND",
    );
  }

  return comment;
}

export async function createTaskCommentService({
  actor,
  taskId,
  body,
}: CreateTaskCommentParams): Promise<TaskCommentDetail> {
  const db = getDb();
  const commentId = createDocumentId("taskComments");
  const commentRef = db.collection(COLLECTIONS.taskComments).doc(commentId);
  const taskRef = db.collection(COLLECTIONS.tasks).doc(taskId);
  const commentBody = body.trim();

  await db.runTransaction(async (transaction) => {
    const taskSnap = await transaction.get(taskRef);
    const task = normalizeTaskForCommentOrThrow(
      taskSnap.id,
      taskSnap.exists ? taskSnap.data() : undefined,
    );
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "TASK_COMMENT_CREATED",
      module: "task_comment",
      entityId: commentId,
      entityType: "taskComment",
      oldValue: null,
      newValue: {
        id: commentId,
        taskId: task.id,
        projectId: task.projectId,
        body: commentBody,
      },
    });

    transaction.set(commentRef, {
      id: commentId,
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      projectName: task.projectName,
      projectCode: task.projectCode,
      userId: actor.uid,
      userName: actor.name,
      userEmail: actor.email,
      body: commentBody,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getTaskCommentByIdService(commentId);
}

export async function updateTaskCommentService({
  actor,
  id,
  body,
}: UpdateTaskCommentParams): Promise<TaskCommentDetail> {
  const db = getDb();
  const commentRef = db.collection(COLLECTIONS.taskComments).doc(id);
  const commentBody = body.trim();

  await db.runTransaction(async (transaction) => {
    const commentSnap = await transaction.get(commentRef);
    const oldComment = normalizeCommentOrThrow(
      commentSnap.id,
      commentSnap.exists ? commentSnap.data() : undefined,
    );

    if (oldComment.userId !== actor.uid) {
      throw new AppError(
        "Hanya pemilik komentar yang dapat mengubah komentar ini.",
        403,
        "TASK_COMMENT_UPDATE_FORBIDDEN",
      );
    }

    const taskRef = db.collection(COLLECTIONS.tasks).doc(oldComment.taskId);
    const taskSnap = await transaction.get(taskRef);
    normalizeTaskForCommentOrThrow(
      taskSnap.id,
      taskSnap.exists ? taskSnap.data() : undefined,
    );

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "TASK_COMMENT_UPDATED",
      module: "task_comment",
      entityId: id,
      entityType: "taskComment",
      oldValue: {
        taskId: oldComment.taskId,
        body: oldComment.body,
      },
      newValue: {
        taskId: oldComment.taskId,
        body: commentBody,
      },
    });

    transaction.update(commentRef, {
      body: commentBody,
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getTaskCommentByIdService(id);
}

export async function deleteTaskCommentService({
  actor,
  id,
  canDeleteAny,
}: TaskCommentIdParams): Promise<TaskCommentDetail> {
  const db = getDb();
  const commentRef = db.collection(COLLECTIONS.taskComments).doc(id);
  const deletedComment = await db.runTransaction(async (transaction) => {
    const commentSnap = await transaction.get(commentRef);
    const oldComment = normalizeCommentOrThrow(
      commentSnap.id,
      commentSnap.exists ? commentSnap.data() : undefined,
    );

    if (!canDeleteAny && oldComment.userId !== actor.uid) {
      throw new AppError(
        "Anda tidak memiliki izin untuk menghapus komentar ini.",
        403,
        "TASK_COMMENT_DELETE_FORBIDDEN",
      );
    }

    const taskRef = db.collection(COLLECTIONS.tasks).doc(oldComment.taskId);
    const taskSnap = await transaction.get(taskRef);
    normalizeTaskForCommentOrThrow(
      taskSnap.id,
      taskSnap.exists ? taskSnap.data() : undefined,
    );

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "TASK_COMMENT_DELETED",
      module: "task_comment",
      entityId: id,
      entityType: "taskComment",
      oldValue: {
        taskId: oldComment.taskId,
        body: oldComment.body,
        deletedAt: oldComment.deletedAt,
      },
      newValue: {
        deletedAt: "SERVER_TIMESTAMP",
      },
    });

    transaction.update(commentRef, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);

    return oldComment;
  });

  return {
    ...deletedComment,
    deletedAt: new Date(),
  };
}

export async function getTaskForCommentOrThrow(
  taskId: string,
): Promise<TaskDetail> {
  return getTaskByIdService(taskId);
}
