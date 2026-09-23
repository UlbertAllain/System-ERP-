"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type {
  TaskCommentDetail,
  TaskCommentListItem,
} from "@/types/task-comment";
import {
  createTaskCommentService,
  deleteTaskCommentService,
  getTaskCommentByIdService,
  getTaskForCommentOrThrow,
  listTaskCommentsService,
  updateTaskCommentService,
} from "@/features/projects/services/task-comment-service";
import {
  createTaskCommentSchema,
  listTaskCommentsSchema,
  taskCommentIdSchema,
  updateTaskCommentSchema,
  type CreateTaskCommentInput,
  type ListTaskCommentsInput,
  type TaskCommentIdInput,
  type UpdateTaskCommentInput,
} from "@/features/projects/schemas/task-comment-schema";
import { canAccessTask } from "@/features/projects/actions/project-access-scope";

function revalidateTaskCommentPaths() {
  revalidatePath("/projects/tasks");
  revalidatePath("/dashboard");
}

export async function listTaskCommentsAction(
  input: ListTaskCommentsInput,
): Promise<ActionResponse<TaskCommentListItem[]>> {
  try {
    const payload = listTaskCommentsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "task_comment.read");

    const task = await getTaskForCommentOrThrow(payload.taskId);

    if (!(await canAccessTask(auth.user, task))) {
      return {
        success: false,
        message: "Akses ditolak untuk komentar task ini.",
      };
    }

    const comments = await listTaskCommentsService(payload.taskId);

    return successResponse("Komentar task berhasil dimuat.", comments);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createTaskCommentAction(
  input: CreateTaskCommentInput,
): Promise<ActionResponse<TaskCommentDetail>> {
  try {
    const payload = createTaskCommentSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "task_comment.create");

    const task = await getTaskForCommentOrThrow(payload.taskId);

    if (!(await canAccessTask(auth.user, task))) {
      return {
        success: false,
        message: "Akses ditolak untuk membuat komentar pada task ini.",
      };
    }

    const comment = await createTaskCommentService({
      actor: auth.user,
      taskId: task.id,
      body: payload.body,
    });

    revalidateTaskCommentPaths();

    return successResponse("Komentar task berhasil dibuat.", comment);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateTaskCommentAction(
  input: UpdateTaskCommentInput,
): Promise<ActionResponse<TaskCommentDetail>> {
  try {
    const payload = updateTaskCommentSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "task_comment.update_own");

    const existingComment = await getTaskCommentByIdService(payload.id);
    const task = await getTaskForCommentOrThrow(existingComment.taskId);

    if (!(await canAccessTask(auth.user, task))) {
      return {
        success: false,
        message: "Akses ditolak untuk update komentar task ini.",
      };
    }

    if (existingComment.userId !== auth.user.uid) {
      return {
        success: false,
        message: "Hanya pemilik komentar yang bisa mengubah komentar ini.",
      };
    }

    const comment = await updateTaskCommentService({
      actor: auth.user,
      id: payload.id,
      body: payload.body,
    });

    revalidateTaskCommentPaths();

    return successResponse("Komentar task berhasil diperbarui.", comment);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteTaskCommentAction(
  input: TaskCommentIdInput,
): Promise<ActionResponse<TaskCommentDetail>> {
  try {
    const payload = taskCommentIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "task_comment.delete_own",
      "task_comment.delete_any",
    ]);

    const existingComment = await getTaskCommentByIdService(payload.id);
    const task = await getTaskForCommentOrThrow(existingComment.taskId);

    if (!(await canAccessTask(auth.user, task))) {
      return {
        success: false,
        message: "Akses ditolak untuk menghapus komentar task ini.",
      };
    }

    const canDeleteAny = auth.user.permissions.includes(
      "task_comment.delete_any",
    );
    const canDeleteOwn =
      existingComment.userId === auth.user.uid &&
      auth.user.permissions.includes("task_comment.delete_own");

    if (!canDeleteAny && !canDeleteOwn) {
      return {
        success: false,
        message: "Akses ditolak untuk menghapus komentar ini.",
      };
    }

    const comment = await deleteTaskCommentService({
      actor: auth.user,
      id: payload.id,
      canDeleteAny,
    });

    revalidateTaskCommentPaths();

    return successResponse("Komentar task berhasil dihapus.", comment);
  } catch (error) {
    return handleActionError(error);
  }
}
