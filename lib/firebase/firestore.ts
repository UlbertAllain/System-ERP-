import "server-only";

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
} from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

export const COLLECTIONS = {
  users: "users",
  roles: "roles",
  permissions: "permissions",
  employees: "employees",
  clients: "clients",
  projects: "projects",
  projectMembers: "projectMembers",
  milestones: "milestones",
  tasks: "tasks",
  taskComments: "taskComments",
  invoices: "invoices",
  payments: "payments",
  expenses: "expenses",
  leaveRequests: "leaveRequests",
  attendanceRecords: "attendanceRecords",
  auditLogs: "auditLogs",
  loginLogs: "loginLogs",
  settings: "settings",
  cloudinaryAssets: "cloudinaryAssets",
  financeSummaries: "financeSummaries",
  dashboardSummaries: "dashboardSummaries",
} as const;

export type CollectionName = keyof typeof COLLECTIONS;

export function getDb() {
  return getFirebaseAdminFirestore();
}

export function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

export function nowTimestamp() {
  return Timestamp.now();
}

export function docRef<T extends DocumentData = DocumentData>(
  collectionName: CollectionName,
  documentId: string,
): DocumentReference<T> {
  return getDb()
    .collection(COLLECTIONS[collectionName])
    .doc(documentId) as DocumentReference<T>;
}

export function collectionRef<T extends DocumentData = DocumentData>(
  collectionName: CollectionName,
) {
  return getDb().collection(
    COLLECTIONS[collectionName],
  ) as FirebaseFirestore.CollectionReference<T>;
}

export function createDocumentId(collectionName: CollectionName): string {
  return getDb().collection(COLLECTIONS[collectionName]).doc().id;
}
