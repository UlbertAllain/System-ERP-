import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/types/auth";
import type {
  AttendanceRecordDetail,
  AttendanceRecordListItem,
  AttendanceStatus,
} from "@/types/attendance";
import {
  findAttendanceRecordById,
  listAttendanceRecords,
  normalizeAttendanceRecordDocument,
} from "@/modules/hr/repositories/attendance-repository";

type ClockInParams = {
  actor: CurrentUser;
  date?: string;
  status: AttendanceStatus;
  notes?: string | null;
};

type ClockOutParams = {
  actor: CurrentUser;
  id: string;
  notes?: string | null;
};

type UpdateAttendanceParams = {
  actor: CurrentUser;
  id: string;
  date: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
};

type AttendanceRecordIdParams = {
  actor: CurrentUser;
  id: string;
};

type EmployeeSnapshot = {
  id: string;
  fullName: string;
  userId: string;
};

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function validateDateString(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  return value;
}

function optionalDateTimeStringToTimestamp(
  value: string | null | undefined,
): Timestamp | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      "Format tanggal/jam tidak valid.",
      400,
      "INVALID_DATETIME",
    );
  }

  return Timestamp.fromDate(date);
}

async function getEmployeeByCurrentUser(
  actor: CurrentUser,
): Promise<EmployeeSnapshot> {
  if (!actor.employeeId) {
    throw new AppError(
      "Akun ini belum terhubung ke employee profile.",
      400,
      "EMPLOYEE_PROFILE_NOT_LINKED",
    );
  }

  const employeeSnap = await getDb()
    .collection(COLLECTIONS.employees)
    .doc(actor.employeeId)
    .get();

  if (!employeeSnap.exists) {
    throw new AppError(
      "Employee profile tidak ditemukan.",
      404,
      "EMPLOYEE_NOT_FOUND",
    );
  }

  const employee = employeeSnap.data() ?? {};

  if (employee.deletedAt) {
    throw new AppError(
      "Employee profile sudah dihapus.",
      404,
      "EMPLOYEE_DELETED",
    );
  }

  if (employee.userId !== actor.uid) {
    throw new AppError(
      "Employee profile tidak sesuai dengan user login.",
      403,
      "EMPLOYEE_USER_MISMATCH",
    );
  }

  return {
    id: employeeSnap.id,
    fullName: String(employee.fullName ?? actor.name),
    userId: actor.uid,
  };
}

async function getAttendanceRecordOrThrow(
  id: string,
): Promise<AttendanceRecordDetail> {
  const attendance = await findAttendanceRecordById(id);

  if (!attendance) {
    throw new AppError(
      "Attendance record tidak ditemukan.",
      404,
      "ATTENDANCE_NOT_FOUND",
    );
  }

  return attendance;
}

function assertOwnAttendanceRecord(
  actor: CurrentUser,
  attendance: AttendanceRecordDetail,
): void {
  if (attendance.userId !== actor.uid) {
    throw new AppError(
      "Tidak bisa mengakses attendance milik user lain.",
      403,
      "CANNOT_ACCESS_OTHER_ATTENDANCE",
    );
  }
}

function buildAttendanceUniqueId(employeeId: string, date: string): string {
  return `${employeeId}_${date}`;
}

export async function listAttendanceRecordsService(): Promise<
  AttendanceRecordListItem[]
> {
  return listAttendanceRecords();
}

export async function getAttendanceRecordByIdService(
  id: string,
): Promise<AttendanceRecordDetail> {
  return getAttendanceRecordOrThrow(id);
}

export async function clockInService({
  actor,
  date,
  status,
  notes,
}: ClockInParams): Promise<AttendanceRecordDetail> {
  const employee = await getEmployeeByCurrentUser(actor);
  const attendanceDate = validateDateString(date ?? getTodayDateString());
  const attendanceId = buildAttendanceUniqueId(employee.id, attendanceDate);
  const attendanceRef = getDb()
    .collection(COLLECTIONS.attendanceRecords)
    .doc(attendanceId);

  await getDb().runTransaction(async (transaction) => {
    const attendanceSnap = await transaction.get(attendanceRef);

    if (attendanceSnap.exists) {
      const existingAttendance = normalizeAttendanceRecordDocument(
        attendanceSnap.id,
        attendanceSnap.data() ?? {},
      );

      if (existingAttendance.clockInAt) {
        throw new AppError(
          "Clock in untuk tanggal ini sudah tercatat.",
          409,
          "ATTENDANCE_ALREADY_CLOCKED_IN",
        );
      }

      transaction.update(attendanceRef, {
        clockInAt: serverTimestamp(),
        status,
        notes: notes ?? existingAttendance.notes,
        updatedAt: serverTimestamp(),
      });

      return;
    }

    transaction.set(attendanceRef, {
      id: attendanceId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      userId: actor.uid,
      date: attendanceDate,
      clockInAt: serverTimestamp(),
      clockOutAt: null,
      status,
      notes: notes ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await writeAuditLog({
    user: actor,
    action: "ATTENDANCE_CLOCK_IN",
    module: "attendance",
    entityId: attendanceId,
    entityType: "attendanceRecord",
    oldValue: null,
    newValue: {
      id: attendanceId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      date: attendanceDate,
      status,
    },
  });

  return getAttendanceRecordByIdService(attendanceId);
}

export async function clockOutService({
  actor,
  id,
  notes,
}: ClockOutParams): Promise<AttendanceRecordDetail> {
  const oldAttendance = await getAttendanceRecordByIdService(id);

  assertOwnAttendanceRecord(actor, oldAttendance);

  if (!oldAttendance.clockInAt) {
    throw new AppError(
      "Clock out tidak bisa dilakukan sebelum clock in.",
      400,
      "CLOCK_OUT_WITHOUT_CLOCK_IN",
    );
  }

  if (oldAttendance.clockOutAt) {
    throw new AppError(
      "Clock out untuk attendance ini sudah tercatat.",
      409,
      "ATTENDANCE_ALREADY_CLOCKED_OUT",
    );
  }

  await getDb()
    .collection(COLLECTIONS.attendanceRecords)
    .doc(id)
    .update({
      clockOutAt: serverTimestamp(),
      notes: notes ?? oldAttendance.notes,
      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "ATTENDANCE_CLOCK_OUT",
    module: "attendance",
    entityId: id,
    entityType: "attendanceRecord",
    oldValue: {
      clockOutAt: oldAttendance.clockOutAt,
    },
    newValue: {
      clockOutAt: "SERVER_TIMESTAMP",
    },
  });

  return getAttendanceRecordByIdService(id);
}

export async function updateAttendanceService({
  actor,
  id,
  date,
  clockInAt,
  clockOutAt,
  status,
  notes,
}: UpdateAttendanceParams): Promise<AttendanceRecordDetail> {
  const oldAttendance = await getAttendanceRecordByIdService(id);
  const attendanceDate = validateDateString(date);

  await getDb()
    .collection(COLLECTIONS.attendanceRecords)
    .doc(id)
    .update({
      date: attendanceDate,
      clockInAt: optionalDateTimeStringToTimestamp(clockInAt),
      clockOutAt: optionalDateTimeStringToTimestamp(clockOutAt),
      status,
      notes: notes ?? null,
      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "ATTENDANCE_UPDATED",
    module: "attendance",
    entityId: id,
    entityType: "attendanceRecord",
    oldValue: {
      date: oldAttendance.date,
      clockInAt: oldAttendance.clockInAt,
      clockOutAt: oldAttendance.clockOutAt,
      status: oldAttendance.status,
      notes: oldAttendance.notes,
    },
    newValue: {
      date: attendanceDate,
      clockInAt: clockInAt ?? null,
      clockOutAt: clockOutAt ?? null,
      status,
      notes: notes ?? null,
    },
  });

  return getAttendanceRecordByIdService(id);
}

export async function deleteAttendanceRecordService({
  actor,
  id,
}: AttendanceRecordIdParams): Promise<AttendanceRecordDetail> {
  const oldAttendance = await getAttendanceRecordByIdService(id);

  await getDb().collection(COLLECTIONS.attendanceRecords).doc(id).delete();

  await writeAuditLog({
    user: actor,
    action: "ATTENDANCE_DELETED",
    module: "attendance",
    entityId: id,
    entityType: "attendanceRecord",
    oldValue: {
      id,
      employeeId: oldAttendance.employeeId,
      employeeName: oldAttendance.employeeName,
      userId: oldAttendance.userId,
      date: oldAttendance.date,
      status: oldAttendance.status,
    },
    newValue: null,
  });

  return oldAttendance;
}
