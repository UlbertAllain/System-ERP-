import { AppError } from "@/lib/errors/app-error";
import type { MilestoneStatus } from "@/types/milestone";

export const MILESTONE_STATUS_TRANSITIONS: Record<
  MilestoneStatus,
  readonly MilestoneStatus[]
> = {
  PLANNED: ["PLANNED", "IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["ON_HOLD", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["COMPLETED", "IN_PROGRESS"],
  CANCELLED: ["CANCELLED", "PLANNED"],
};

export function assertValidMilestoneStatusTransition(
  currentStatus: MilestoneStatus,
  nextStatus: MilestoneStatus,
): void {
  if (!MILESTONE_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    throw new AppError(
      `Perubahan status milestone dari ${currentStatus} ke ${nextStatus} tidak diizinkan.`,
      409,
      "INVALID_MILESTONE_STATUS_TRANSITION",
    );
  }
}
