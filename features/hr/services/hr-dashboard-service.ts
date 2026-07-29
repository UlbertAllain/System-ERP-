import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import type {
  AttendanceRecordListItem,
  AttendanceStatus,
} from "@/types/attendance";
import type {
  LeaveRequestListItem,
  LeaveRequestStatus,
  LeaveRequestType,
} from "@/types/leave";
import type { HrDashboardSummary } from "@/types/hr-dashboard";

function timestampToDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  return null;
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeLeaveRequestDocument(
  id: string,
  data: DocumentData,
): LeaveRequestListItem {
  return {
    id,
    employeeId: String(data.employeeId ?? ""),
    employeeName: String(data.employeeName ?? ""),
    userId: String(data.userId ?? ""),
    type: data.type as LeaveRequestType,
    startDate: timestampToDate(data.startDate),
    endDate: timestampToDate(data.endDate),
    totalDays: Number(data.totalDays ?? 0),
    reason: String(data.reason ?? ""),
    status: data.status as LeaveRequestStatus,
    approvedById: data.approvedById ?? null,
    approvedByName: data.approvedByName ?? null,
    approvedAt: timestampToDate(data.approvedAt),
    rejectedReason: data.rejectedReason ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

function normalizeAttendanceRecordDocument(
  id: string,
  data: DocumentData,
): AttendanceRecordListItem {
  return {
    id,
    employeeId: String(data.employeeId ?? ""),
    employeeName: String(data.employeeName ?? ""),
    userId: String(data.userId ?? ""),
    date: String(data.date ?? ""),
    clockInAt: timestampToDate(data.clockInAt),
    clockOutAt: timestampToDate(data.clockOutAt),
    status: data.status as AttendanceStatus,
    notes: data.notes ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export async function getHrDashboardSummaryService(): Promise<HrDashboardSummary> {
  const db = getDb();
  const today = getTodayDateString();

  const [
    activeEmployeesSnap,
    pendingLeaveRequestsSnap,
    todayAttendanceSnap,
    recentLeaveRequestsSnap,
    recentAttendanceRecordsSnap,
  ] = await Promise.all([
    db
      .collection(COLLECTIONS.employees)
      .where("status", "==", "ACTIVE")
      .where("deletedAt", "==", null)
      .get(),

    db
      .collection(COLLECTIONS.leaveRequests)
      .where("status", "==", "SUBMITTED")
      .where("deletedAt", "==", null)
      .get(),

    db
      .collection(COLLECTIONS.attendanceRecords)
      .where("date", "==", today)
      .get(),

    db
      .collection(COLLECTIONS.leaveRequests)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get(),

    db
      .collection(COLLECTIONS.attendanceRecords)
      .orderBy("date", "desc")
      .limit(5)
      .get(),
  ]);

  const todayAttendanceRecords = todayAttendanceSnap.docs.map((doc) =>
    normalizeAttendanceRecordDocument(doc.id, doc.data()),
  );

  const todayClockedIn = todayAttendanceRecords.filter(
    (attendance) => attendance.clockInAt !== null,
  ).length;

  const activeEmployees = activeEmployeesSnap.size;

  const recentLeaveRequests = recentLeaveRequestsSnap.docs
    .map((doc) => normalizeLeaveRequestDocument(doc.id, doc.data()))
    .filter((leaveRequest) => leaveRequest.deletedAt === null);

  const recentAttendanceRecords = recentAttendanceRecordsSnap.docs.map((doc) =>
    normalizeAttendanceRecordDocument(doc.id, doc.data()),
  );

  return {
    activeEmployees,
    pendingLeaveRequests: pendingLeaveRequestsSnap.size,
    todayAttendanceRecords: todayAttendanceRecords.length,
    todayClockedIn,
    todayNotClockedIn: Math.max(activeEmployees - todayClockedIn, 0),
    recentLeaveRequests,
    recentAttendanceRecords,
  };
}
