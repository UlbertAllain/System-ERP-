import { AppError } from "@/lib/errors/app-error";
import type { TaskStatus } from "@/types/task";

export const TASK_STATUS_TRANSITIONS: Record<
  TaskStatus,
  readonly TaskStatus[]
> = {
  TODO: ["TODO", "IN_PROGRESS", "BLOCKED", "CANCELLED"],
  IN_PROGRESS: [
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "DONE",
    "BLOCKED",
    "CANCELLED",
  ],
  IN_REVIEW: ["IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED", "CANCELLED"],
  BLOCKED: ["TODO", "IN_PROGRESS", "BLOCKED", "CANCELLED"],
  DONE: ["DONE", "IN_PROGRESS"],
  CANCELLED: ["CANCELLED", "TODO"],
};

export function assertValidTaskStatusTransition(
  currentStatus: TaskStatus,
  nextStatus: TaskStatus,
): void {
  if (!TASK_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    throw new AppError(
      `Perubahan status task dari ${currentStatus} ke ${nextStatus} tidak diizinkan.`,
      409,
      "INVALID_TASK_STATUS_TRANSITION",
    );
  }
}

export function assertValidTaskDateRange(
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
