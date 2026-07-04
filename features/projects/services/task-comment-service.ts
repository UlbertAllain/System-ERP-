import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/types/auth";
import type {
  TaskCommentDetail,
  TaskCommentListItem,
} from "@/types/task-comment";
import type { TaskDetail } from "@/types/task";
import { getTaskByIdService } from "@/features/projects/services/task-service";

type CreateTaskCommentParams = {
  actor: CurrentUser;
  task: TaskDetail;
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

function normalizeTaskCommentDocument(
  id: string,
  data: DocumentData,
): TaskCommentListItem {
  return {
    id,
    taskId: String(data.taskId ?? ""),
    taskTitle: String(data.taskTitle ?? ""),
    projectId: String(data.projectId ?? ""),
    projectName: String(data.projectName ?? ""),
    projectCode: String(data.projectCode ?? ""),
    userId: String(data.userId ?? ""),
    userName: String(data.userName ?? ""),
    userEmail: String(data.userEmail ?? ""),
    body: String(data.body ?? ""),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

export async function listTaskCommentsService(
  taskId: string,
): Promise<TaskCommentListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.taskComments)
    .where("taskId", "==", taskId)
    .orderBy("createdAt", "asc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeTaskCommentDocument(doc.id, doc.data()))
    .filter((comment) => comment.deletedAt === null);
}

export async function getTaskCommentByIdService(
  id: string,
): Promise<TaskCommentDetail> {
  const commentSnap = await getDb()
    .collection(COLLECTIONS.taskComments)
    .doc(id)
    .get();

  if (!commentSnap.exists) {
    throw new AppError("Komentar task tidak ditemukan.", 404, "TASK_COMMENT_NOT_FOUND");
  }

  const comment = normalizeTaskCommentDocument(
    commentSnap.id,
    commentSnap.data() ?? {},
  );

  if (comment.deletedAt) {
    throw new AppError("Komentar task sudah dihapus.", 404, "TASK_COMMENT_DELETED");
  }

  return comment;
}

export async function createTaskCommentService({
  actor,
  task,
  body,
}: CreateTaskCommentParams): Promise<TaskCommentDetail> {
  const commentId = createDocumentId("taskComments");
  const commentBody = body.trim();

  await getDb()
    .collection(COLLECTIONS.taskComments)
    .doc(commentId)
    .set({
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

  await writeAuditLog({
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

  return getTaskCommentByIdService(commentId);
}

export async function updateTaskCommentService({
  actor,
  id,
  body,
}: UpdateTaskCommentParams): Promise<TaskCommentDetail> {
  const oldComment = await getTaskCommentByIdService(id);
  const commentBody = body.trim();

  await getDb().collection(COLLECTIONS.taskComments).doc(id).update({
    body: commentBody,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
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

  return getTaskCommentByIdService(id);
}

export async function deleteTaskCommentService({
  actor,
  id,
}: TaskCommentIdParams): Promise<TaskCommentDetail> {
  const oldComment = await getTaskCommentByIdService(id);

  await getDb().collection(COLLECTIONS.taskComments).doc(id).update({
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
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

  return {
    ...oldComment,
    deletedAt: new Date(),
  };
}

export async function getTaskForCommentOrThrow(taskId: string): Promise<TaskDetail> {
  return getTaskByIdService(taskId);
}
