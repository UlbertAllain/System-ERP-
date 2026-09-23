"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { PaginatedResult } from "@/types/common";
import type { TaskDetail, TaskListItem } from "@/types/task";
import {
  createTaskService,
  deleteTaskService,
  getTaskByIdService,
  listTasksPaginatedService,
  listTasksService,
  updateTaskService,
} from "@/modules/projects/services/task-service";
import {
  createTaskSchema,
  listTasksSchema,
  taskIdSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type ListTasksInput,
  type TaskIdInput,
  type UpdateTaskInput,
} from "@/modules/projects/schemas/task-schema";
import {
  canAccessProjectForMutation,
  canAccessTask,
  filterTasksForUser,
  userHasOnlyAssignedTaskRead,
} from "@/modules/projects/actions/project-access-scope";

function revalidateTaskPaths() {
  revalidatePath("/projects");
  revalidatePath("/projects/tasks");
  revalidatePath("/projects/milestones");
}

export async function listTasksAction(
  input: Partial<ListTasksInput> = {},
): Promise<ActionResponse<TaskListItem[]>> {
  try {
    const payload = listTasksSchema.partial().parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "task.read",
      "task.read_all",
      "task.read_assigned",
    ]);

    const tasks = await listTasksService({
      projectId: payload.projectId,
      milestoneId: payload.milestoneId,
      assigneeEmployeeId: payload.assigneeEmployeeId,
    });
    const scopedTasks = await filterTasksForUser(auth.user, tasks);

    return successResponse("Tasks berhasil dimuat.", scopedTasks);
  } catch (error) {
    return handleActionError(error);
  }
}

function paginateTasks(
  tasks: TaskListItem[],
  page: number,
  pageSize: number,
): PaginatedResult<TaskListItem> {
  const totalItems = tasks.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const offset = (page - 1) * pageSize;

  return {
    items: tasks.slice(offset, offset + pageSize),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}

function filterTasksByInput(tasks: TaskListItem[], input: ListTasksInput) {
  const search = input.search?.trim().toLowerCase();

  return tasks.filter((task) => {
    if (input.projectId && task.projectId !== input.projectId) {
      return false;
    }

    if (input.milestoneId && task.milestoneId !== input.milestoneId) {
      return false;
    }

    if (
      input.assigneeEmployeeId &&
      task.assigneeEmployeeId !== input.assigneeEmployeeId
    ) {
      return false;
    }

    if (input.status && task.status !== input.status) {
      return false;
    }

    if (input.priority && task.priority !== input.priority) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      task.title,
      task.projectCode,
      task.projectName,
      task.milestoneTitle,
      task.assigneeName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}

export async function listTasksPaginatedAction(
  input: Partial<ListTasksInput> = {},
): Promise<ActionResponse<PaginatedResult<TaskListItem>>> {
  try {
    const payload = listTasksSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "task.read",
      "task.read_all",
      "task.read_assigned",
    ]);

    if (userHasOnlyAssignedTaskRead(auth.user)) {
      const tasks = await listTasksService({});
      const scopedTasks = await filterTasksForUser(auth.user, tasks);
      const filteredTasks = filterTasksByInput(scopedTasks, payload);

      return successResponse(
        "Tasks berhasil dimuat.",
        paginateTasks(filteredTasks, payload.page, payload.pageSize),
      );
    }

    const tasks = await listTasksPaginatedService({
      projectId: payload.projectId,
      milestoneId: payload.milestoneId,
      assigneeEmployeeId: payload.assigneeEmployeeId,
      search: payload.search,
      status: payload.status,
      priority: payload.priority,
      page: payload.page,
      pageSize: payload.pageSize,
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

    requireAnyPermission(auth.user, [
      "task.read",
      "task.read_all",
      "task.read_assigned",
    ]);

    const task = await getTaskByIdService(payload.id);

    if (!(await canAccessTask(auth.user, task))) {
      return {
        success: false,
        message: "Akses ditolak untuk task ini.",
      };
    }

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

    if (!(await canAccessProjectForMutation(auth.user, payload.projectId))) {
      return {
        success: false,
        message: "Akses ditolak untuk membuat task pada project ini.",
      };
    }

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

    requireAnyPermission(auth.user, ["task.update", "task.update_assigned"]);

    if (
      auth.user.permissions.includes("task.update_assigned") &&
      !auth.user.permissions.includes("task.update")
    ) {
      const task = await getTaskByIdService(payload.id);

      if (!(await canAccessTask(auth.user, task))) {
        return {
          success: false,
          message: "Akses ditolak untuk update task ini.",
        };
      }
    }

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
