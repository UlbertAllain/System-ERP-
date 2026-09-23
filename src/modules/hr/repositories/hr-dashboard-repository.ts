import "server-only";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { normalizeAttendanceRecordDocument } from "@/features/hr/repositories/attendance-repository";
import { normalizeLeaveRequestDocument } from "@/features/hr/repositories/leave-repository";
import type { AttendanceRecordListItem } from "@/types/attendance";
import type { LeaveRequestListItem } from "@/types/leave";

export type HrDashboardReadModel = {
  activeEmployees: number;
  pendingLeaveRequests: number;
  todayAttendanceRecords: AttendanceRecordListItem[];
  recentLeaveRequests: LeaveRequestListItem[];
  recentAttendanceRecords: AttendanceRecordListItem[];
};

export async function getHrDashboardReadModel(
  today: string,
): Promise<HrDashboardReadModel> {
  const db = getDb();

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

  return {
    activeEmployees: activeEmployeesSnap.size,
    pendingLeaveRequests: pendingLeaveRequestsSnap.size,
    todayAttendanceRecords: todayAttendanceSnap.docs.map((doc) =>
      normalizeAttendanceRecordDocument(doc.id, doc.data()),
    ),
    recentLeaveRequests: recentLeaveRequestsSnap.docs
      .map((doc) => normalizeLeaveRequestDocument(doc.id, doc.data()))
      .filter((leaveRequest) => leaveRequest.deletedAt === null),
    recentAttendanceRecords: recentAttendanceRecordsSnap.docs.map((doc) =>
      normalizeAttendanceRecordDocument(doc.id, doc.data()),
    ),
  };
}
