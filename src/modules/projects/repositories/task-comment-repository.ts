import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  TaskCommentDetail,
  TaskCommentListItem,
} from "@/types/task-comment";

export function normalizeTaskCommentDocument(
  id: string,
  data: DocumentData,
): TaskCommentDetail {
  return {
    id,
    taskId: String(data.taskId ?? ""),
    taskTitle: String(data.taskTitle ?? ""),
    projectId: String(data.projectId ?? ""),
    projectName: String(data.projectName ?? ""),
    projectCode: String(data.projectCode ?? ""),
    userId: String(data.userId ?? ""),
    userName: String(data.userName ?? ""),
    userEmail: String(data.userEmail ?? ""),
    body: String(data.body ?? ""),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

export async function findTaskCommentById(
  id: string,
): Promise<TaskCommentDetail | null> {
  const snap = await getDb()
    .collection(COLLECTIONS.taskComments)
    .doc(id)
    .get();

  if (!snap.exists) {
    return null;
  }

  return normalizeTaskCommentDocument(snap.id, snap.data() ?? {});
}

export async function listTaskComments(
  taskId: string,
): Promise<TaskCommentListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.taskComments)
    .where("taskId", "==", taskId)
    .orderBy("createdAt", "asc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeTaskCommentDocument(doc.id, doc.data()))
    .filter((comment) => comment.deletedAt === null);
}
