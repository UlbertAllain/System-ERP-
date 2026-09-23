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
  AttendanceRecordDetail,
  AttendanceRecordListItem,
} from "@/types/attendance";
import {
  clockInService,
  clockOutService,
  deleteAttendanceRecordService,
  getAttendanceRecordByIdService,
  listAttendanceRecordsService,
  updateAttendanceService,
} from "@/modules/hr/services/attendance-service";
import {
  attendanceRecordIdSchema,
  clockInSchema,
  clockOutSchema,
  listAttendanceRecordsSchema,
  updateAttendanceSchema,
  type AttendanceRecordIdInput,
  type ClockInInput,
  type ClockOutInput,
  type ListAttendanceRecordsInput,
  type UpdateAttendanceInput,
} from "@/modules/hr/schemas/attendance-schema";

function revalidateAttendancePaths() {
  revalidatePath("/hr");
  revalidatePath("/hr/attendance");
}

export async function listAttendanceRecordsAction(
  input: ListAttendanceRecordsInput = {},
): Promise<ActionResponse<AttendanceRecordListItem[]>> {
  try {
    listAttendanceRecordsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "attendance.read",
      "attendance.read_all",
      "attendance.read_own",
    ]);

    const attendanceRecords = await listAttendanceRecordsService();

    if (
      auth.user.permissions.includes("attendance.read_own") &&
      !auth.user.permissions.includes("attendance.read") &&
      !auth.user.permissions.includes("attendance.read_all")
    ) {
      return successResponse(
        "Attendance berhasil dimuat.",
        attendanceRecords.filter(
          (attendanceRecord) => attendanceRecord.userId === auth.user.uid,
        ),
      );
    }

    return successResponse("Attendance berhasil dimuat.", attendanceRecords);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getAttendanceRecordByIdAction(
  input: AttendanceRecordIdInput,
): Promise<ActionResponse<AttendanceRecordDetail>> {
  try {
    const payload = attendanceRecordIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "attendance.read",
      "attendance.read_all",
      "attendance.read_own",
    ]);

    const attendance = await getAttendanceRecordByIdService(payload.id);

    if (
      auth.user.permissions.includes("attendance.read_own") &&
      !auth.user.permissions.includes("attendance.read") &&
      !auth.user.permissions.includes("attendance.read_all") &&
      attendance.userId !== auth.user.uid
    ) {
      return {
        success: false,
        message: "Akses ditolak untuk attendance ini.",
      };
    }

    return successResponse("Attendance berhasil dimuat.", attendance);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function clockInAction(
  input: ClockInInput,
): Promise<ActionResponse<AttendanceRecordDetail>> {
  try {
    const payload = clockInSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "attendance.clock_in");

    const attendance = await clockInService({
      actor: auth.user,
      date: payload.date,
      status: payload.status,
      notes: payload.notes,
    });

    revalidateAttendancePaths();

    return successResponse("Clock in berhasil.", attendance);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function clockOutAction(
  input: ClockOutInput,
): Promise<ActionResponse<AttendanceRecordDetail>> {
  try {
    const payload = clockOutSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "attendance.clock_out");

    const attendance = await clockOutService({
      actor: auth.user,
      id: payload.id,
      notes: payload.notes,
    });

    revalidateAttendancePaths();

    return successResponse("Clock out berhasil.", attendance);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateAttendanceAction(
  input: UpdateAttendanceInput,
): Promise<ActionResponse<AttendanceRecordDetail>> {
  try {
    const payload = updateAttendanceSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "attendance.update");

    const attendance = await updateAttendanceService({
      actor: auth.user,
      ...payload,
    });

    revalidateAttendancePaths();

    return successResponse("Attendance berhasil diperbarui.", attendance);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteAttendanceRecordAction(
  input: AttendanceRecordIdInput,
): Promise<ActionResponse<AttendanceRecordDetail>> {
  try {
    const payload = attendanceRecordIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "attendance.delete");

    const attendance = await deleteAttendanceRecordService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateAttendancePaths();

    return successResponse("Attendance berhasil dihapus.", attendance);
  } catch (error) {
    return handleActionError(error);
  }
}
