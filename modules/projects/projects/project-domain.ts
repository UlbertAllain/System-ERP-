import { AppError } from "@/lib/errors/app-error";
import type { ProjectStatus } from "@/types/project";

export const PROJECT_STATUS_TRANSITIONS: Record<
  ProjectStatus,
  readonly ProjectStatus[]
> = {
  PLANNING: ["PLANNING", "IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["ON_HOLD", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["COMPLETED", "IN_PROGRESS"],
  CANCELLED: ["CANCELLED", "PLANNING"],
  ARCHIVED: ["ARCHIVED"],
};

export function assertValidProjectStatusTransition(
  currentStatus: ProjectStatus,
  nextStatus: ProjectStatus,
): void {
  if (!PROJECT_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    throw new AppError(
      `Perubahan status proyek dari ${currentStatus} ke ${nextStatus} tidak diizinkan.`,
      409,
      "INVALID_PROJECT_STATUS_TRANSITION",
    );
  }
}
