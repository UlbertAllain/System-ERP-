import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  ProjectMemberDetail,
  ProjectMemberListItem,
  ProjectMemberRole,
  ProjectMemberStatus,
} from "@/types/project-member";

export function normalizeProjectMemberDocument(
  id: string,
  data: DocumentData,
): ProjectMemberDetail {
  return {
    id,
    projectId: String(data.projectId ?? ""),
    projectName: String(data.projectName ?? ""),
    projectCode: String(data.projectCode ?? ""),
    employeeId: String(data.employeeId ?? ""),
    employeeName: String(data.employeeName ?? ""),
    userId: data.userId ?? null,
    role: data.role as ProjectMemberRole,
    status: data.status as ProjectMemberStatus,
    joinedAt: timestampToDate(data.joinedAt),
    leftAt: timestampToDate(data.leftAt),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

export async function findProjectMemberById(
  id: string,
): Promise<ProjectMemberDetail | null> {
  const snap = await getDb()
    .collection(COLLECTIONS.projectMembers)
    .doc(id)
    .get();

  if (!snap.exists) {
    return null;
  }

  return normalizeProjectMemberDocument(snap.id, snap.data() ?? {});
}

export async function listProjectMembers(
  projectId?: string,
): Promise<ProjectMemberListItem[]> {
  const baseQuery = getDb().collection(COLLECTIONS.projectMembers);
  const querySnap = projectId
    ? await baseQuery.where("projectId", "==", projectId).get()
    : await baseQuery.get();

  return querySnap.docs
    .map((doc) => normalizeProjectMemberDocument(doc.id, doc.data()))
    .filter((member) => member.deletedAt === null)
    .sort((a, b) => {
      if (a.projectCode === b.projectCode) {
        return a.employeeName.localeCompare(b.employeeName);
      }
      return a.projectCode.localeCompare(b.projectCode);
    });
}
