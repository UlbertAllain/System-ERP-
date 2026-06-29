"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { TaskDetail, TaskListItem } from "@/types/task";
import {
  createTaskService,
  deleteTaskService,
  getTaskByIdService,
  listTasksService,
  updateTaskService,
} from "@/features/projects/services/task-service";
import {
  createTaskSchema,
  listTasksSchema,
  taskIdSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type ListTasksInput,
  type TaskIdInput,
  type UpdateTaskInput,
} from "@/features/projects/schemas/task-schema";

function revalidateTaskPaths() {
  revalidatePath("/projects");
  revalidatePath("/projects/tasks");
  revalidatePath("/projects/milestones");
}

export async function listTasksAction(
  input: ListTasksInput = {},
): Promise<ActionResponse<TaskListItem[]>> {
  try {
    const payload = listTasksSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "task.read");

    const tasks = await listTasksService({
      projectId: payload.projectId,
      milestoneId: payload.milestoneId,
      assigneeEmployeeId: payload.assigneeEmployeeId,
    });

    return successResponse("Tasks berhasil dimuat.", tasks);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getTaskByIdAction(
  input: TaskIdInput,
): Promise<ActionResponse<TaskDetail>> {
  try {
    const payload = taskIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "task.read");

    const task = await getTaskByIdService(payload.id);

    return successResponse("Task berhasil dimuat.", task);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createTaskAction(
  input: CreateTaskInput,
): Promise<ActionResponse<TaskDetail>> {
  try {
    const payload = createTaskSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "task.create");

    const task = await createTaskService({
      actor: auth.user,
      ...payload,
    });

    revalidateTaskPaths();

    return successResponse("Task berhasil dibuat.", task);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateTaskAction(
  input: UpdateTaskInput,
): Promise<ActionResponse<TaskDetail>> {
  try {
    const payload = updateTaskSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "task.update");

    const task = await updateTaskService({
      actor: auth.user,
      ...payload,
    });

    revalidateTaskPaths();

    return successResponse("Task berhasil diperbarui.", task);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteTaskAction(
  input: TaskIdInput,
): Promise<ActionResponse<TaskDetail>> {
  try {
    const payload = taskIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "task.delete");

    const task = await deleteTaskService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateTaskPaths();

    return successResponse("Task berhasil dihapus.", task);
  } catch (error) {
    return handleActionError(error);
  }
}
