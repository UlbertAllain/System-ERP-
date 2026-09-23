import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  MilestoneDetail,
  MilestoneListItem,
  MilestoneStatus,
} from "@/types/milestone";

export function normalizeMilestoneDocument(
  id: string,
  data: DocumentData,
): MilestoneDetail {
  return {
    id,
    projectId: String(data.projectId ?? ""),
    projectName: String(data.projectName ?? ""),
    projectCode: String(data.projectCode ?? ""),
    title: String(data.title ?? ""),
    description: data.description ?? null,
    status: data.status as MilestoneStatus,
    order: Number(data.order ?? 0),
    startDate: timestampToDate(data.startDate),
    dueDate: timestampToDate(data.dueDate),
    completedAt: timestampToDate(data.completedAt),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

export async function findMilestoneById(
  id: string,
): Promise<MilestoneDetail | null> {
  const snap = await getDb().collection(COLLECTIONS.milestones).doc(id).get();

  if (!snap.exists) {
    return null;
  }

  return normalizeMilestoneDocument(snap.id, snap.data() ?? {});
}

export async function listMilestones(
  projectId?: string,
): Promise<MilestoneListItem[]> {
  const baseQuery = getDb().collection(COLLECTIONS.milestones);
  const querySnap = projectId
    ? await baseQuery.where("projectId", "==", projectId).get()
    : await baseQuery.get();

  return querySnap.docs
    .map((doc) => normalizeMilestoneDocument(doc.id, doc.data()))
    .filter((milestone) => milestone.deletedAt === null)
    .sort((a, b) => {
      if (a.projectCode === b.projectCode) {
        return a.order - b.order;
      }
      return a.projectCode.localeCompare(b.projectCode);
    });
}
