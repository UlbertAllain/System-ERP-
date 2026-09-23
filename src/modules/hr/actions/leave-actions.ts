"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { LeaveRequestDetail, LeaveRequestListItem } from "@/types/leave";
import {
  approveLeaveRequestService,
  cancelLeaveRequestService,
  createLeaveRequestService,
  getLeaveRequestByIdService,
  listLeaveRequestsService,
  rejectLeaveRequestService,
  submitLeaveRequestService,
  updateOwnLeaveRequestService,
} from "@/modules/hr/services/leave-service";
import {
  createLeaveRequestSchema,
  leaveRequestIdSchema,
  listLeaveRequestsSchema,
  rejectLeaveRequestSchema,
  updateOwnLeaveRequestSchema,
  type CreateLeaveRequestInput,
  type LeaveRequestIdInput,
  type ListLeaveRequestsInput,
  type RejectLeaveRequestInput,
  type UpdateOwnLeaveRequestInput,
} from "@/modules/hr/schemas/leave-schema";

function revalidateLeavePaths() {
  revalidatePath("/hr");
  revalidatePath("/hr/leave-requests");
}

export async function listLeaveRequestsAction(
  input: ListLeaveRequestsInput = {},
): Promise<ActionResponse<LeaveRequestListItem[]>> {
  try {
    listLeaveRequestsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "leave.read",
      "leave.read_all",
      "leave.read_own",
    ]);

    const leaveRequests = await listLeaveRequestsService();

    if (
      auth.user.permissions.includes("leave.read_own") &&
      !auth.user.permissions.includes("leave.read") &&
      !auth.user.permissions.includes("leave.read_all")
    ) {
      return successResponse(
        "Leave requests berhasil dimuat.",
        leaveRequests.filter(
          (leaveRequest) => leaveRequest.userId === auth.user.uid,
        ),
      );
    }

    return successResponse("Leave requests berhasil dimuat.", leaveRequests);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getLeaveRequestByIdAction(
  input: LeaveRequestIdInput,
): Promise<ActionResponse<LeaveRequestDetail>> {
  try {
    const payload = leaveRequestIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "leave.read",
      "leave.read_all",
      "leave.read_own",
    ]);

    const leaveRequest = await getLeaveRequestByIdService(payload.id);

    if (
      auth.user.permissions.includes("leave.read_own") &&
      !auth.user.permissions.includes("leave.read") &&
      !auth.user.permissions.includes("leave.read_all") &&
      leaveRequest.userId !== auth.user.uid
    ) {
      return {
        success: false,
        message: "Akses ditolak untuk leave request ini.",
      };
    }

    return successResponse("Leave request berhasil dimuat.", leaveRequest);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createLeaveRequestAction(
  input: CreateLeaveRequestInput,
): Promise<ActionResponse<LeaveRequestDetail>> {
  try {
    const payload = createLeaveRequestSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "leave.create");

    const leaveRequest = await createLeaveRequestService({
      actor: auth.user,
      ...payload,
    });

    revalidateLeavePaths();

    return successResponse("Leave request berhasil dibuat.", leaveRequest);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateOwnLeaveRequestAction(
  input: UpdateOwnLeaveRequestInput,
): Promise<ActionResponse<LeaveRequestDetail>> {
  try {
    const payload = updateOwnLeaveRequestSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "leave.update_own");

    const leaveRequest = await updateOwnLeaveRequestService({
      actor: auth.user,
      ...payload,
    });

    revalidateLeavePaths();

    return successResponse("Leave request berhasil diperbarui.", leaveRequest);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function submitLeaveRequestAction(
  input: LeaveRequestIdInput,
): Promise<ActionResponse<LeaveRequestDetail>> {
  try {
    const payload = leaveRequestIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "leave.submit");

    const leaveRequest = await submitLeaveRequestService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateLeavePaths();

    return successResponse("Leave request berhasil disubmit.", leaveRequest);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function approveLeaveRequestAction(
  input: LeaveRequestIdInput,
): Promise<ActionResponse<LeaveRequestDetail>> {
  try {
    const payload = leaveRequestIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "leave.approve");

    const leaveRequest = await approveLeaveRequestService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateLeavePaths();

    return successResponse("Leave request berhasil disetujui.", leaveRequest);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function rejectLeaveRequestAction(
  input: RejectLeaveRequestInput,
): Promise<ActionResponse<LeaveRequestDetail>> {
  try {
    const payload = rejectLeaveRequestSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "leave.reject");

    const leaveRequest = await rejectLeaveRequestService({
      actor: auth.user,
      id: payload.id,
      rejectedReason: payload.rejectedReason,
    });

    revalidateLeavePaths();

    return successResponse("Leave request berhasil ditolak.", leaveRequest);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function cancelLeaveRequestAction(
  input: LeaveRequestIdInput,
): Promise<ActionResponse<LeaveRequestDetail>> {
  try {
    const payload = leaveRequestIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "leave.cancel");

    const leaveRequest = await cancelLeaveRequestService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateLeavePaths();

    return successResponse("Leave request berhasil dibatalkan.", leaveRequest);
  } catch (error) {
    return handleActionError(error);
  }
}
