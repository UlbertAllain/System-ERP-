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
  MilestoneDetail,
  MilestoneListItem,
  MilestoneStatus,
} from "@/types/milestone";

type CreateMilestoneParams = {
  actor: CurrentUser;
  projectId: string;
  title: string;
  description?: string | null;
  order: number;
  startDate?: string | null;
  dueDate?: string | null;
};

type UpdateMilestoneParams = {
  actor: CurrentUser;
  id: string;
  title: string;
  description?: string | null;
  status: MilestoneStatus;
  order: number;
  startDate?: string | null;
  dueDate?: string | null;
};

type MilestoneIdParams = {
  actor: CurrentUser;
  id: string;
};

type ListMilestonesParams = {
  projectId?: string;
};

type ProjectSnapshot = {
  id: string;
  name: string;
  projectCode: string;
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

function normalizeNullableString(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
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

function assertValidMilestoneDateRange(
  startDate?: string | null,
  dueDate?: string | null,
): void {
  if (!startDate || !dueDate) {
    return;
  }

  const start = new Date(startDate);
  const due = new Date(dueDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  if (due.getTime() < start.getTime()) {
    throw new AppError(
      "Due date tidak boleh sebelum start date.",
      400,
      "INVALID_MILESTONE_DATE_RANGE",
    );
  }
}

function normalizeMilestoneDocument(
  id: string,
  data: DocumentData,
): MilestoneListItem {
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

async function getProjectSnapshotOrThrow(
  projectId: string,
): Promise<ProjectSnapshot> {
  const projectSnap = await getDb()
    .collection(COLLECTIONS.projects)
    .doc(projectId)
    .get();

  if (!projectSnap.exists) {
    throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
  }

  const project = projectSnap.data() ?? {};

  if (project.deletedAt) {
    throw new AppError("Project sudah dihapus.", 400, "PROJECT_DELETED");
  }

  if (project.status === "ARCHIVED") {
    throw new AppError("Project sudah diarsipkan.", 400, "PROJECT_ARCHIVED");
  }

  return {
    id: projectSnap.id,
    name: String(project.name ?? ""),
    projectCode: String(project.projectCode ?? ""),
  };
}

async function getMilestoneDocumentOrThrow(
  id: string,
): Promise<MilestoneDetail> {
  const milestoneSnap = await getDb()
    .collection(COLLECTIONS.milestones)
    .doc(id)
    .get();

  if (!milestoneSnap.exists) {
    throw new AppError(
      "Milestone tidak ditemukan.",
      404,
      "MILESTONE_NOT_FOUND",
    );
  }

  return normalizeMilestoneDocument(
    milestoneSnap.id,
    milestoneSnap.data() ?? {},
  );
}

export async function listMilestonesService({
  projectId,
}: ListMilestonesParams = {}): Promise<MilestoneListItem[]> {
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

export async function getMilestoneByIdService(
  id: string,
): Promise<MilestoneDetail> {
  const milestone = await getMilestoneDocumentOrThrow(id);

  if (milestone.deletedAt) {
    throw new AppError("Milestone sudah dihapus.", 404, "MILESTONE_DELETED");
  }

  return milestone;
}

export async function createMilestoneService({
  actor,
  projectId,
  title,
  description,
  order,
  startDate,
  dueDate,
}: CreateMilestoneParams): Promise<MilestoneDetail> {
  assertValidMilestoneDateRange(startDate, dueDate);

  const project = await getProjectSnapshotOrThrow(projectId);
  const milestoneId = createDocumentId("milestones");
  const milestoneTitle = title.trim();

  await getDb()
    .collection(COLLECTIONS.milestones)
    .doc(milestoneId)
    .set({
      id: milestoneId,
      projectId: project.id,
      projectName: project.name,
      projectCode: project.projectCode,
      title: milestoneTitle,
      description: normalizeNullableString(description),
      status: "PLANNED",
      order,
      startDate: dateStringToTimestamp(startDate),
      dueDate: dateStringToTimestamp(dueDate),
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });

  await writeAuditLog({
    user: actor,
    action: "MILESTONE_CREATED",
    module: "milestone",
    entityId: milestoneId,
    entityType: "milestone",
    oldValue: null,
    newValue: {
      id: milestoneId,
      projectId: project.id,
      projectName: project.name,
      projectCode: project.projectCode,
      title: milestoneTitle,
      status: "PLANNED",
      order,
    },
  });

  return getMilestoneByIdService(milestoneId);
}

export async function updateMilestoneService({
  actor,
  id,
  title,
  description,
  status,
  order,
  startDate,
  dueDate,
}: UpdateMilestoneParams): Promise<MilestoneDetail> {
  const oldMilestone = await getMilestoneByIdService(id);

  assertValidMilestoneDateRange(startDate, dueDate);

  const completedAt =
    status === "COMPLETED"
      ? (oldMilestone.completedAt ?? serverTimestamp())
      : null;

  await getDb()
    .collection(COLLECTIONS.milestones)
    .doc(id)
    .update({
      title: title.trim(),
      description: normalizeNullableString(description),
      status,
      order,
      startDate: dateStringToTimestamp(startDate),
      dueDate: dateStringToTimestamp(dueDate),
      completedAt,
      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "MILESTONE_UPDATED",
    module: "milestone",
    entityId: id,
    entityType: "milestone",
    oldValue: {
      title: oldMilestone.title,
      status: oldMilestone.status,
      order: oldMilestone.order,
      completedAt: oldMilestone.completedAt,
    },
    newValue: {
      title: title.trim(),
      status,
      order,
      completedAt:
        status === "COMPLETED" ? "SERVER_TIMESTAMP_OR_EXISTING" : null,
    },
  });

  return getMilestoneByIdService(id);
}

export async function deleteMilestoneService({
  actor,
  id,
}: MilestoneIdParams): Promise<MilestoneDetail> {
  const oldMilestone = await getMilestoneByIdService(id);

  await getDb().collection(COLLECTIONS.milestones).doc(id).update({
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "MILESTONE_DELETED",
    module: "milestone",
    entityId: id,
    entityType: "milestone",
    oldValue: {
      title: oldMilestone.title,
      status: oldMilestone.status,
      deletedAt: oldMilestone.deletedAt,
    },
    newValue: {
      deletedAt: "SERVER_TIMESTAMP",
    },
  });

  return {
    ...oldMilestone,
    deletedAt: new Date(),
  };
}
