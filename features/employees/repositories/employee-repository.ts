import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  EmployeeDepartment,
  EmployeeDetail,
  EmployeeListItem,
  EmployeeStatus,
  EmploymentType,
} from "@/types/employee";

export function normalizeEmployeeDocument(
  id: string,
  data: DocumentData,
): EmployeeDetail {
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

export async function findEmployeeById(
  id: string,
): Promise<EmployeeDetail | null> {
  const snap = await getDb().collection(COLLECTIONS.employees).doc(id).get();

  if (!snap.exists) {
    return null;
  }

  return normalizeEmployeeDocument(snap.id, snap.data() ?? {});
}

export async function listEmployees(): Promise<EmployeeListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.employees)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeEmployeeDocument(doc.id, doc.data()))
    .filter((employee) => employee.deletedAt === null);
}
