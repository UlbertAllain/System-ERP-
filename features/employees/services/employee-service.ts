import "server-only";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { AppError } from "@/lib/errors/app-error";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { CurrentUser } from "@/types/auth";
import type {
  EmployeeDepartment,
  EmployeeDetail,
  EmployeeListItem,
  EmployeeStatus,
  EmploymentType,
} from "@/types/employee";
import { deleteCloudinaryImage } from "@/lib/cloudinary/server";
import type { ImageAsset } from "@/types/common";

type CreateEmployeeParams = {
  actor: CurrentUser;
  userId?: string | null;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  position: string;
  department: EmployeeDepartment;
  employmentType: EmploymentType;
  joinDate: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
};

type UpdateEmployeeParams = CreateEmployeeParams & {
  id: string;
  resignDate?: string | null;
  status: EmployeeStatus;
};

type UpdateOwnEmployeeProfileParams = {
  actor: CurrentUser;
  id: string;
  phone?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
};
type UpdateEmployeePhotoParams = {
  actor: CurrentUser;
  id: string;
  photo: ImageAsset;
};

type EmployeeIdParams = {
  actor: CurrentUser;
  id: string;
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

function dateStringToTimestamp(
  value: string | null | undefined,
): Timestamp | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  return Timestamp.fromDate(date);
}

function normalizeEmployeeDocument(
  id: string,
  data: DocumentData,
): EmployeeListItem {
  return {
    id,
    userId: data.userId ?? null,
    employeeCode: String(data.employeeCode ?? ""),
    fullName: String(data.fullName ?? ""),
    email: String(data.email ?? ""),
    phone: data.phone ?? null,
    address: data.address ?? null,
    photo: data.photo ?? null,
    position: String(data.position ?? ""),
    department: data.department as EmployeeDepartment,
    employmentType: data.employmentType as EmploymentType,
    joinDate: timestampToDate(data.joinDate),
    resignDate: timestampToDate(data.resignDate),
    status: data.status as EmployeeStatus,
    emergencyContactName: data.emergencyContactName ?? null,
    emergencyContactPhone: data.emergencyContactPhone ?? null,
    notes: data.notes ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

async function assertEmployeeCodeUnique(
  employeeCode: string,
  ignoredEmployeeId?: string,
): Promise<void> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.employees)
    .where("employeeCode", "==", employeeCode)
    .limit(1)
    .get();

  if (querySnap.empty) {
    return;
  }

  const existingDoc = querySnap.docs[0];

  if (existingDoc.id !== ignoredEmployeeId) {
    throw new AppError(
      "Employee code sudah digunakan.",
      409,
      "EMPLOYEE_CODE_ALREADY_USED",
    );
  }
}

async function assertEmployeeEmailUnique(
  email: string,
  ignoredEmployeeId?: string,
): Promise<void> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.employees)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (querySnap.empty) {
    return;
  }

  const existingDoc = querySnap.docs[0];

  if (existingDoc.id !== ignoredEmployeeId) {
    throw new AppError(
      "Email employee sudah digunakan.",
      409,
      "EMPLOYEE_EMAIL_ALREADY_USED",
    );
  }
}

async function assertUserLinkValid(
  userId: string | null | undefined,
  ignoredEmployeeId?: string,
): Promise<void> {
  if (!userId) {
    return;
  }

  const userSnap = await getDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .get();

  if (!userSnap.exists) {
    throw new AppError("User link tidak ditemukan.", 404, "USER_NOT_FOUND");
  }

  const employeeQuery = await getDb()
    .collection(COLLECTIONS.employees)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (employeeQuery.empty) {
    return;
  }

  const existingDoc = employeeQuery.docs[0];

  if (existingDoc.id !== ignoredEmployeeId) {
    throw new AppError(
      "User ini sudah terhubung dengan employee lain.",
      409,
      "USER_ALREADY_LINKED_TO_EMPLOYEE",
    );
  }
}

async function getEmployeeDocumentOrThrow(id: string): Promise<EmployeeDetail> {
  const employeeSnap = await getDb()
    .collection(COLLECTIONS.employees)
    .doc(id)
    .get();

  if (!employeeSnap.exists) {
    throw new AppError("Employee tidak ditemukan.", 404, "EMPLOYEE_NOT_FOUND");
  }

  return normalizeEmployeeDocument(employeeSnap.id, employeeSnap.data() ?? {});
}

async function syncUserEmployeeLink(
  userId: string | null | undefined,
  employeeId: string | null,
): Promise<void> {
  if (!userId) {
    return;
  }

  await getDb().collection(COLLECTIONS.users).doc(userId).update({
    employeeId,
    updatedAt: serverTimestamp(),
  });
}

export async function listEmployeesService(): Promise<EmployeeListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.employees)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeEmployeeDocument(doc.id, doc.data()))
    .filter((employee) => employee.deletedAt === null);
}

export async function getEmployeeByIdService(
  id: string,
): Promise<EmployeeDetail> {
  const employee = await getEmployeeDocumentOrThrow(id);

  if (employee.deletedAt) {
    throw new AppError("Employee sudah dihapus.", 404, "EMPLOYEE_DELETED");
  }

  return employee;
}

export async function createEmployeeService({
  actor,
  userId,
  employeeCode,
  fullName,
  email,
  phone,
  address,
  position,
  department,
  employmentType,
  joinDate,
  emergencyContactName,
  emergencyContactPhone,
  notes,
}: CreateEmployeeParams): Promise<EmployeeDetail> {
  await assertEmployeeCodeUnique(employeeCode);
  await assertEmployeeEmailUnique(email);
  await assertUserLinkValid(userId);

  const employeeId = createDocumentId("employees");

  await getDb()
    .collection(COLLECTIONS.employees)
    .doc(employeeId)
    .set({
      id: employeeId,
      userId: userId ?? null,
      employeeCode,
      fullName,
      email,
      phone: phone ?? null,
      address: address ?? null,
      photo: null,
      position,
      department,
      employmentType,
      joinDate: dateStringToTimestamp(joinDate),
      resignDate: null,
      status: "ACTIVE",
      emergencyContactName: emergencyContactName ?? null,
      emergencyContactPhone: emergencyContactPhone ?? null,
      notes: notes ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });

  await syncUserEmployeeLink(userId, employeeId);

  await writeAuditLog({
    user: actor,
    action: "EMPLOYEE_CREATED",
    module: "employee",
    entityId: employeeId,
    entityType: "employee",
    oldValue: null,
    newValue: {
      employeeId,
      userId: userId ?? null,
      employeeCode,
      fullName,
      email,
      department,
      employmentType,
      status: "ACTIVE",
    },
  });

  return getEmployeeByIdService(employeeId);
}

export async function updateEmployeeService({
  actor,
  id,
  userId,
  employeeCode,
  fullName,
  email,
  phone,
  address,
  position,
  department,
  employmentType,
  joinDate,
  resignDate,
  status,
  emergencyContactName,
  emergencyContactPhone,
  notes,
}: UpdateEmployeeParams): Promise<EmployeeDetail> {
  const oldEmployee = await getEmployeeByIdService(id);

  await assertEmployeeCodeUnique(employeeCode, id);
  await assertEmployeeEmailUnique(email, id);
  await assertUserLinkValid(userId, id);

  await getDb()
    .collection(COLLECTIONS.employees)
    .doc(id)
    .update({
      userId: userId ?? null,
      employeeCode,
      fullName,
      email,
      phone: phone ?? null,
      address: address ?? null,
      position,
      department,
      employmentType,
      joinDate: dateStringToTimestamp(joinDate),
      resignDate: dateStringToTimestamp(resignDate),
      status,
      emergencyContactName: emergencyContactName ?? null,
      emergencyContactPhone: emergencyContactPhone ?? null,
      notes: notes ?? null,
      updatedAt: serverTimestamp(),
    });

  if (oldEmployee.userId && oldEmployee.userId !== userId) {
    await syncUserEmployeeLink(oldEmployee.userId, null);
  }

  await syncUserEmployeeLink(userId, id);

  await writeAuditLog({
    user: actor,
    action: "EMPLOYEE_UPDATED",
    module: "employee",
    entityId: id,
    entityType: "employee",
    oldValue: {
      employeeCode: oldEmployee.employeeCode,
      fullName: oldEmployee.fullName,
      email: oldEmployee.email,
      userId: oldEmployee.userId,
      status: oldEmployee.status,
    },
    newValue: {
      employeeCode,
      fullName,
      email,
      userId: userId ?? null,
      status,
    },
  });

  return getEmployeeByIdService(id);
}

export async function updateOwnEmployeeProfileService({
  actor,
  id,
  phone,
  address,
  emergencyContactName,
  emergencyContactPhone,
  notes,
}: UpdateOwnEmployeeProfileParams): Promise<EmployeeDetail> {
  const oldEmployee = await getEmployeeByIdService(id);

  if (oldEmployee.userId !== actor.uid) {
    throw new AppError(
      "Tidak bisa mengubah profile employee milik user lain.",
      403,
      "CANNOT_UPDATE_OTHER_EMPLOYEE_PROFILE",
    );
  }

  await getDb()
    .collection(COLLECTIONS.employees)
    .doc(id)
    .update({
      phone: phone ?? null,
      address: address ?? null,
      emergencyContactName: emergencyContactName ?? null,
      emergencyContactPhone: emergencyContactPhone ?? null,
      notes: notes ?? null,
      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "OWN_EMPLOYEE_PROFILE_UPDATED",
    module: "employee",
    entityId: id,
    entityType: "employee",
    oldValue: {
      phone: oldEmployee.phone,
      address: oldEmployee.address,
      emergencyContactName: oldEmployee.emergencyContactName,
      emergencyContactPhone: oldEmployee.emergencyContactPhone,
      notes: oldEmployee.notes,
    },
    newValue: {
      phone: phone ?? null,
      address: address ?? null,
      emergencyContactName: emergencyContactName ?? null,
      emergencyContactPhone: emergencyContactPhone ?? null,
      notes: notes ?? null,
    },
  });

  return getEmployeeByIdService(id);
}

export async function updateEmployeePhotoService({
  actor,
  id,
  photo,
}: UpdateEmployeePhotoParams): Promise<EmployeeDetail> {
  const oldEmployee = await getEmployeeByIdService(id);

  const canUpdateAnyEmployeePhoto =
    actor.permissions.includes("employee.update") ||
    actor.permissions.includes("employee.read_all");

  const canUpdateOwnEmployeePhoto = oldEmployee.userId === actor.uid;

  if (!canUpdateAnyEmployeePhoto && !canUpdateOwnEmployeePhoto) {
    throw new AppError(
      "Tidak bisa mengubah foto employee milik user lain.",
      403,
      "CANNOT_UPDATE_OTHER_EMPLOYEE_PHOTO",
    );
  }

  await getDb().collection(COLLECTIONS.employees).doc(id).update({
    photo,
    updatedAt: serverTimestamp(),
  });

  if (
    oldEmployee.photo?.publicId &&
    oldEmployee.photo.publicId !== photo.publicId
  ) {
    await deleteCloudinaryImage(oldEmployee.photo.publicId);
  }

  await writeAuditLog({
    user: actor,
    action: "EMPLOYEE_PHOTO_UPDATED",
    module: "employee",
    entityId: id,
    entityType: "employee",
    oldValue: {
      photo: oldEmployee.photo,
    },
    newValue: {
      photo,
    },
  });

  return getEmployeeByIdService(id);
}

export async function deleteEmployeeService({
  actor,
  id,
}: EmployeeIdParams): Promise<EmployeeDetail> {
  const oldEmployee = await getEmployeeByIdService(id);

  await getDb().collection(COLLECTIONS.employees).doc(id).update({
    status: "INACTIVE",
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (oldEmployee.userId) {
    await syncUserEmployeeLink(oldEmployee.userId, null);
  }

  await writeAuditLog({
    user: actor,
    action: "EMPLOYEE_DELETED",
    module: "employee",
    entityId: id,
    entityType: "employee",
    oldValue: {
      status: oldEmployee.status,
      deletedAt: oldEmployee.deletedAt,
      userId: oldEmployee.userId,
    },
    newValue: {
      status: "INACTIVE",
      deletedAt: "SERVER_TIMESTAMP",
      userId: null,
    },
  });

  return {
    ...oldEmployee,
    status: "INACTIVE",
    deletedAt: new Date(),
  };
}

export async function restoreEmployeeService({
  actor,
  id,
}: EmployeeIdParams): Promise<EmployeeDetail> {
  const employeeSnap = await getDb()
    .collection(COLLECTIONS.employees)
    .doc(id)
    .get();

  if (!employeeSnap.exists) {
    throw new AppError("Employee tidak ditemukan.", 404, "EMPLOYEE_NOT_FOUND");
  }

  const oldEmployee = normalizeEmployeeDocument(
    employeeSnap.id,
    employeeSnap.data() ?? {},
  );

  await getDb().collection(COLLECTIONS.employees).doc(id).update({
    status: "ACTIVE",
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });

  if (oldEmployee.userId) {
    await assertUserLinkValid(oldEmployee.userId, id);
    await syncUserEmployeeLink(oldEmployee.userId, id);
  }

  await writeAuditLog({
    user: actor,
    action: "EMPLOYEE_RESTORED",
    module: "employee",
    entityId: id,
    entityType: "employee",
    oldValue: {
      status: oldEmployee.status,
      deletedAt: oldEmployee.deletedAt,
    },
    newValue: {
      status: "ACTIVE",
      deletedAt: null,
    },
  });

  return getEmployeeByIdService(id);
}
