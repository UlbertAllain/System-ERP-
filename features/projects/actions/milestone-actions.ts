"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { MilestoneDetail, MilestoneListItem } from "@/types/milestone";
import {
  createMilestoneService,
  deleteMilestoneService,
  getMilestoneByIdService,
  listMilestonesService,
  updateMilestoneService,
} from "@/features/projects/services/milestone-service";
import {
  createMilestoneSchema,
  listMilestonesSchema,
  milestoneIdSchema,
  updateMilestoneSchema,
  type CreateMilestoneInput,
  type ListMilestonesInput,
  type MilestoneIdInput,
  type UpdateMilestoneInput,
} from "@/features/projects/schemas/milestone-schema";

function revalidateMilestonePaths() {
  revalidatePath("/projects");
  revalidatePath("/projects/milestones");
}

export async function listMilestonesAction(
  input: ListMilestonesInput = {},
): Promise<ActionResponse<MilestoneListItem[]>> {
  try {
    const payload = listMilestonesSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "milestone.read");

    const milestones = await listMilestonesService({
      projectId: payload.projectId,
    });

    return successResponse("Milestones berhasil dimuat.", milestones);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getMilestoneByIdAction(
  input: MilestoneIdInput,
): Promise<ActionResponse<MilestoneDetail>> {
  try {
    const payload = milestoneIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "milestone.read");

    const milestone = await getMilestoneByIdService(payload.id);

    return successResponse("Milestone berhasil dimuat.", milestone);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createMilestoneAction(
  input: CreateMilestoneInput,
): Promise<ActionResponse<MilestoneDetail>> {
  try {
    const payload = createMilestoneSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "milestone.create");

    const milestone = await createMilestoneService({
      actor: auth.user,
      ...payload,
    });

    revalidateMilestonePaths();

    return successResponse("Milestone berhasil dibuat.", milestone);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateMilestoneAction(
  input: UpdateMilestoneInput,
): Promise<ActionResponse<MilestoneDetail>> {
  try {
    const payload = updateMilestoneSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "milestone.update");

    const milestone = await updateMilestoneService({
      actor: auth.user,
      ...payload,
    });

    revalidateMilestonePaths();

    return successResponse("Milestone berhasil diperbarui.", milestone);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteMilestoneAction(
  input: MilestoneIdInput,
): Promise<ActionResponse<MilestoneDetail>> {
  try {
    const payload = milestoneIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "milestone.delete");

    const milestone = await deleteMilestoneService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateMilestonePaths();

    return successResponse("Milestone berhasil dihapus.", milestone);
  } catch (error) {
    return handleActionError(error);
  }
}
