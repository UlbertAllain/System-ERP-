import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  AttendanceRecordDetail,
  AttendanceRecordListItem,
  AttendanceStatus,
} from "@/types/attendance";

export function normalizeAttendanceRecordDocument(
  id: string,
  data: DocumentData,
): AttendanceRecordDetail {
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

export async function findAttendanceRecordById(
  id: string,
): Promise<AttendanceRecordDetail | null> {
  const snap = await getDb()
    .collection(COLLECTIONS.attendanceRecords)
    .doc(id)
    .get();

  if (!snap.exists) {
    return null;
  }

  return normalizeAttendanceRecordDocument(snap.id, snap.data() ?? {});
}

export async function listAttendanceRecords(): Promise<
  AttendanceRecordListItem[]
> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.attendanceRecords)
    .orderBy("date", "desc")
    .get();

  return querySnap.docs.map((doc) =>
    normalizeAttendanceRecordDocument(doc.id, doc.data()),
  );
}
