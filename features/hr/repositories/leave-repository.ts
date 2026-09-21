import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  LeaveRequestDetail,
  LeaveRequestListItem,
  LeaveRequestStatus,
  LeaveRequestType,
} from "@/types/leave";

export function normalizeLeaveRequestDocument(
  id: string,
  data: DocumentData,
): LeaveRequestDetail {
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

export async function findLeaveRequestById(
  id: string,
): Promise<LeaveRequestDetail | null> {
  const snap = await getDb()
    .collection(COLLECTIONS.leaveRequests)
    .doc(id)
    .get();

  if (!snap.exists) {
    return null;
  }

  return normalizeLeaveRequestDocument(snap.id, snap.data() ?? {});
}

export async function listLeaveRequests(): Promise<LeaveRequestListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.leaveRequests)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeLeaveRequestDocument(doc.id, doc.data()))
    .filter((leaveRequest) => leaveRequest.deletedAt === null);
}
