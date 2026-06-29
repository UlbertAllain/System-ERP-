import "server-only";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/types/auth";
import type {
  LeaveRequestDetail,
  LeaveRequestListItem,
  LeaveRequestStatus,
  LeaveRequestType,
} from "@/types/leave";

type CreateLeaveRequestParams = {
  actor: CurrentUser;
  type: LeaveRequestType;
  startDate: string;
  endDate: string;
  reason: string;
};

type UpdateOwnLeaveRequestParams = CreateLeaveRequestParams & {
  id: string;
};

type LeaveRequestIdParams = {
  actor: CurrentUser;
  id: string;
};

type RejectLeaveRequestParams = {
  actor: CurrentUser;
  id: string;
  rejectedReason: string;
};

type EmployeeSnapshot = {
  id: string;
  fullName: string;
  userId: string;
};

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

function dateStringToDate(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  return date;
}

function dateStringToTimestamp(value: string): Timestamp {
  return Timestamp.fromDate(dateStringToDate(value));
}

function calculateTotalDays(startDate: string, endDate: string): number {
  const start = dateStringToDate(startDate);
  const end = dateStringToDate(endDate);

  if (end.getTime() < start.getTime()) {
    throw new AppError(
      "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      400,
      "INVALID_LEAVE_DATE_RANGE",
    );
  }

  const oneDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor((end.getTime() - start.getTime()) / oneDay);

  return diff + 1;
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

async function getLeaveRequestOrThrow(id: string): Promise<LeaveRequestDetail> {
  const leaveSnap = await getDb()
    .collection(COLLECTIONS.leaveRequests)
    .doc(id)
    .get();

  if (!leaveSnap.exists) {
    throw new AppError(
      "Leave request tidak ditemukan.",
      404,
      "LEAVE_REQUEST_NOT_FOUND",
    );
  }

  return normalizeLeaveRequestDocument(leaveSnap.id, leaveSnap.data() ?? {});
}

function assertOwnLeaveRequest(
  actor: CurrentUser,
  leaveRequest: LeaveRequestDetail,
): void {
  if (leaveRequest.userId !== actor.uid) {
    throw new AppError(
      "Tidak bisa mengakses leave request milik user lain.",
      403,
      "CANNOT_ACCESS_OTHER_LEAVE_REQUEST",
    );
  }
}

function assertLeaveRequestEditable(leaveRequest: LeaveRequestDetail): void {
  if (leaveRequest.status !== "DRAFT") {
    throw new AppError(
      "Leave request hanya bisa diubah saat status DRAFT.",
      400,
      "LEAVE_REQUEST_NOT_EDITABLE",
    );
  }
}

function assertLeaveRequestSubmittable(leaveRequest: LeaveRequestDetail): void {
  if (leaveRequest.status !== "DRAFT") {
    throw new AppError(
      "Leave request hanya bisa disubmit dari status DRAFT.",
      400,
      "LEAVE_REQUEST_NOT_SUBMITTABLE",
    );
  }
}

function assertLeaveRequestReviewable(leaveRequest: LeaveRequestDetail): void {
  if (leaveRequest.status !== "SUBMITTED") {
    throw new AppError(
      "Leave request hanya bisa direview saat status SUBMITTED.",
      400,
      "LEAVE_REQUEST_NOT_REVIEWABLE",
    );
  }
}

function assertLeaveRequestCancellable(leaveRequest: LeaveRequestDetail): void {
  if (!["DRAFT", "SUBMITTED"].includes(leaveRequest.status)) {
    throw new AppError(
      "Leave request hanya bisa dibatalkan sebelum approved/rejected.",
      400,
      "LEAVE_REQUEST_NOT_CANCELLABLE",
    );
  }
}

export async function listLeaveRequestsService(): Promise<
  LeaveRequestListItem[]
> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.leaveRequests)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeLeaveRequestDocument(doc.id, doc.data()))
    .filter((leaveRequest) => leaveRequest.deletedAt === null);
}

export async function getLeaveRequestByIdService(
  id: string,
): Promise<LeaveRequestDetail> {
  const leaveRequest = await getLeaveRequestOrThrow(id);

  if (leaveRequest.deletedAt) {
    throw new AppError(
      "Leave request sudah dihapus.",
      404,
      "LEAVE_REQUEST_DELETED",
    );
  }

  return leaveRequest;
}

export async function createLeaveRequestService({
  actor,
  type,
  startDate,
  endDate,
  reason,
}: CreateLeaveRequestParams): Promise<LeaveRequestDetail> {
  const employee = await getEmployeeByCurrentUser(actor);
  const totalDays = calculateTotalDays(startDate, endDate);
  const leaveRequestId = createDocumentId("leaveRequests");

  await getDb()
    .collection(COLLECTIONS.leaveRequests)
    .doc(leaveRequestId)
    .set({
      id: leaveRequestId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      userId: actor.uid,
      type,
      startDate: dateStringToTimestamp(startDate),
      endDate: dateStringToTimestamp(endDate),
      totalDays,
      reason,
      status: "DRAFT",
      approvedById: null,
      approvedByName: null,
      approvedAt: null,
      rejectedReason: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });

  await writeAuditLog({
    user: actor,
    action: "LEAVE_REQUEST_CREATED",
    module: "leave",
    entityId: leaveRequestId,
    entityType: "leaveRequest",
    oldValue: null,
    newValue: {
      id: leaveRequestId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      type,
      startDate,
      endDate,
      totalDays,
      status: "DRAFT",
    },
  });

  return getLeaveRequestByIdService(leaveRequestId);
}

export async function updateOwnLeaveRequestService({
  actor,
  id,
  type,
  startDate,
  endDate,
  reason,
}: UpdateOwnLeaveRequestParams): Promise<LeaveRequestDetail> {
  const oldLeaveRequest = await getLeaveRequestByIdService(id);

  assertOwnLeaveRequest(actor, oldLeaveRequest);
  assertLeaveRequestEditable(oldLeaveRequest);

  const totalDays = calculateTotalDays(startDate, endDate);

  await getDb()
    .collection(COLLECTIONS.leaveRequests)
    .doc(id)
    .update({
      type,
      startDate: dateStringToTimestamp(startDate),
      endDate: dateStringToTimestamp(endDate),
      totalDays,
      reason,
      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "LEAVE_REQUEST_UPDATED",
    module: "leave",
    entityId: id,
    entityType: "leaveRequest",
    oldValue: {
      type: oldLeaveRequest.type,
      startDate: oldLeaveRequest.startDate,
      endDate: oldLeaveRequest.endDate,
      totalDays: oldLeaveRequest.totalDays,
      reason: oldLeaveRequest.reason,
    },
    newValue: {
      type,
      startDate,
      endDate,
      totalDays,
      reason,
    },
  });

  return getLeaveRequestByIdService(id);
}

export async function submitLeaveRequestService({
  actor,
  id,
}: LeaveRequestIdParams): Promise<LeaveRequestDetail> {
  const oldLeaveRequest = await getLeaveRequestByIdService(id);

  assertOwnLeaveRequest(actor, oldLeaveRequest);
  assertLeaveRequestSubmittable(oldLeaveRequest);

  await getDb().collection(COLLECTIONS.leaveRequests).doc(id).update({
    status: "SUBMITTED",
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "LEAVE_REQUEST_SUBMITTED",
    module: "leave",
    entityId: id,
    entityType: "leaveRequest",
    oldValue: {
      status: oldLeaveRequest.status,
    },
    newValue: {
      status: "SUBMITTED",
    },
  });

  return getLeaveRequestByIdService(id);
}

export async function approveLeaveRequestService({
  actor,
  id,
}: LeaveRequestIdParams): Promise<LeaveRequestDetail> {
  const oldLeaveRequest = await getLeaveRequestByIdService(id);

  assertLeaveRequestReviewable(oldLeaveRequest);

  await getDb().collection(COLLECTIONS.leaveRequests).doc(id).update({
    status: "APPROVED",
    approvedById: actor.uid,
    approvedByName: actor.name,
    approvedAt: serverTimestamp(),
    rejectedReason: null,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "LEAVE_REQUEST_APPROVED",
    module: "leave",
    entityId: id,
    entityType: "leaveRequest",
    oldValue: {
      status: oldLeaveRequest.status,
      approvedById: oldLeaveRequest.approvedById,
      approvedByName: oldLeaveRequest.approvedByName,
    },
    newValue: {
      status: "APPROVED",
      approvedById: actor.uid,
      approvedByName: actor.name,
    },
  });

  return getLeaveRequestByIdService(id);
}

export async function rejectLeaveRequestService({
  actor,
  id,
  rejectedReason,
}: RejectLeaveRequestParams): Promise<LeaveRequestDetail> {
  const oldLeaveRequest = await getLeaveRequestByIdService(id);

  assertLeaveRequestReviewable(oldLeaveRequest);

  await getDb().collection(COLLECTIONS.leaveRequests).doc(id).update({
    status: "REJECTED",
    approvedById: actor.uid,
    approvedByName: actor.name,
    approvedAt: serverTimestamp(),
    rejectedReason,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "LEAVE_REQUEST_REJECTED",
    module: "leave",
    entityId: id,
    entityType: "leaveRequest",
    oldValue: {
      status: oldLeaveRequest.status,
      rejectedReason: oldLeaveRequest.rejectedReason,
    },
    newValue: {
      status: "REJECTED",
      approvedById: actor.uid,
      approvedByName: actor.name,
      rejectedReason,
    },
  });

  return getLeaveRequestByIdService(id);
}

export async function cancelLeaveRequestService({
  actor,
  id,
}: LeaveRequestIdParams): Promise<LeaveRequestDetail> {
  const oldLeaveRequest = await getLeaveRequestByIdService(id);

  assertOwnLeaveRequest(actor, oldLeaveRequest);
  assertLeaveRequestCancellable(oldLeaveRequest);

  await getDb().collection(COLLECTIONS.leaveRequests).doc(id).update({
    status: "CANCELLED",
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "LEAVE_REQUEST_CANCELLED",
    module: "leave",
    entityId: id,
    entityType: "leaveRequest",
    oldValue: {
      status: oldLeaveRequest.status,
    },
    newValue: {
      status: "CANCELLED",
    },
  });

  return getLeaveRequestByIdService(id);
}
