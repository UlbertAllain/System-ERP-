import "server-only";

import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";

import { getAuditLogDocument } from "@/lib/audit/audit-log";
import {
  dateStringToTimestamp,
  normalizeNullableString,
} from "@/lib/domain/firestore-value";
import { AppError } from "@/lib/errors/app-error";
import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import type { CurrentUser } from "@/types/auth";
import type {
  MilestoneDetail,
  MilestoneListItem,
  MilestoneStatus,
} from "@/types/milestone";
import { assertValidMilestoneStatusTransition } from "@/modules/projects/milestones/milestone-domain";
import {
  findMilestoneById,
  listMilestones,
  normalizeMilestoneDocument,
} from "@/modules/projects/repositories/milestone-repository";

const OPEN_TASK_STATUSES = new Set([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
]);

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
      "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      400,
      "INVALID_MILESTONE_DATE_RANGE",
    );
  }
}

function normalizeProjectSnapshotOrThrow(
  projectSnap: DocumentSnapshot<DocumentData>,
): ProjectSnapshot {
  if (!projectSnap.exists) {
    throw new AppError("Proyek tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
  }

  const project = projectSnap.data() ?? {};

  if (project.deletedAt) {
    throw new AppError("Proyek sudah dihapus.", 409, "PROJECT_DELETED");
  }

  if (
    ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(
      String(project.status ?? ""),
    )
  ) {
    throw new AppError(
      "Proyek sudah berada pada status terminal dan tidak dapat diubah.",
      409,
      "PROJECT_NOT_MUTABLE",
    );
  }

  return {
    id: projectSnap.id,
    name: String(project.name ?? ""),
    projectCode: String(project.projectCode ?? ""),
  };
}

function normalizeMilestoneSnapshotOrThrow(
  milestoneSnap: DocumentSnapshot<DocumentData>,
): MilestoneDetail {
  if (!milestoneSnap.exists) {
    throw new AppError(
      "Milestone tidak ditemukan.",
      404,
      "MILESTONE_NOT_FOUND",
    );
  }

  const milestone = normalizeMilestoneDocument(
    milestoneSnap.id,
    milestoneSnap.data() ?? {},
  );

  if (milestone.deletedAt) {
    throw new AppError("Milestone sudah dihapus.", 404, "MILESTONE_DELETED");
  }

  return milestone;
}

function assertNoOpenTasksForTerminalStatus(
  taskDocs: FirebaseFirestore.QueryDocumentSnapshot[],
): void {
  const hasOpenTask = taskDocs.some((taskDoc) => {
    const task = taskDoc.data();
    return !task.deletedAt && OPEN_TASK_STATUSES.has(String(task.status));
  });

  if (hasOpenTask) {
    throw new AppError(
      "Milestone tidak dapat diselesaikan atau dibatalkan selama masih ada tugas terbuka.",
      409,
      "MILESTONE_HAS_OPEN_TASKS",
    );
  }
}

export async function listMilestonesService({
  projectId,
}: ListMilestonesParams = {}): Promise<MilestoneListItem[]> {
  return listMilestones(projectId);
}

export async function getMilestoneByIdService(
  id: string,
): Promise<MilestoneDetail> {
  const milestone = await findMilestoneById(id);

  if (!milestone || milestone.deletedAt) {
    throw new AppError("Milestone tidak ditemukan.", 404, "MILESTONE_NOT_FOUND");
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

  const db = getDb();
  const milestoneId = createDocumentId("milestones");
  const milestoneRef = db.collection(COLLECTIONS.milestones).doc(milestoneId);
  const projectRef = db.collection(COLLECTIONS.projects).doc(projectId);
  const milestoneTitle = title.trim();

  await db.runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);
    const project = normalizeProjectSnapshotOrThrow(projectSnap);
    const auditLog = getAuditLogDocument({
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

    transaction.set(milestoneRef, {
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
    transaction.set(auditLog.ref, auditLog.data);
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
  assertValidMilestoneDateRange(startDate, dueDate);

  const db = getDb();
  const milestoneRef = db.collection(COLLECTIONS.milestones).doc(id);
  const milestoneTitle = title.trim();

  await db.runTransaction(async (transaction) => {
    const milestoneSnap = await transaction.get(milestoneRef);
    const oldMilestone = normalizeMilestoneSnapshotOrThrow(milestoneSnap);
    assertValidMilestoneStatusTransition(oldMilestone.status, status);
    const projectRef = db
      .collection(COLLECTIONS.projects)
      .doc(oldMilestone.projectId);
    const projectSnap = await transaction.get(projectRef);
    normalizeProjectSnapshotOrThrow(projectSnap);

    if (status === "COMPLETED" || status === "CANCELLED") {
      const tasksQuery = db
        .collection(COLLECTIONS.tasks)
        .where("milestoneId", "==", id);
      const tasksSnap = await transaction.get(tasksQuery);
      assertNoOpenTasksForTerminalStatus(tasksSnap.docs);
    }

    const oldData = milestoneSnap.data() ?? {};
    const completedAt =
      status === "COMPLETED"
        ? (oldData.completedAt ?? serverTimestamp())
        : null;
    const auditLog = getAuditLogDocument({
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
        title: milestoneTitle,
        status,
        order,
        completedAt:
          status === "COMPLETED" ? "SERVER_TIMESTAMP_OR_EXISTING" : null,
      },
    });

    transaction.update(milestoneRef, {
      title: milestoneTitle,
      description: normalizeNullableString(description),
      status,
      order,
      startDate: dateStringToTimestamp(startDate),
      dueDate: dateStringToTimestamp(dueDate),
      completedAt,
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getMilestoneByIdService(id);
}

export async function deleteMilestoneService({
  actor,
  id,
}: MilestoneIdParams): Promise<MilestoneDetail> {
  const db = getDb();
  const milestoneRef = db.collection(COLLECTIONS.milestones).doc(id);

  const oldMilestone = await db.runTransaction(
    async (transaction): Promise<MilestoneDetail> => {
      const milestoneSnap = await transaction.get(milestoneRef);
      const milestone = normalizeMilestoneSnapshotOrThrow(milestoneSnap);

      const projectRef = db
        .collection(COLLECTIONS.projects)
        .doc(milestone.projectId);

      const tasksQuery = db
        .collection(COLLECTIONS.tasks)
        .where("milestoneId", "==", id);

      const [projectSnap, tasksSnap] = await Promise.all([
        transaction.get(projectRef),
        transaction.get(tasksQuery),
      ]);

      normalizeProjectSnapshotOrThrow(projectSnap);

      const hasLinkedTask = tasksSnap.docs.some(
        (taskDoc) => !taskDoc.data().deletedAt,
      );

      if (hasLinkedTask) {
        throw new AppError(
          "Milestone masih memiliki tugas. Pindahkan atau hapus tugas tersebut terlebih dahulu.",
          409,
          "MILESTONE_HAS_TASKS",
        );
      }

      const auditLog = getAuditLogDocument({
        user: actor,
        action: "MILESTONE_DELETED",
        module: "milestone",
        entityId: id,
        entityType: "milestone",
        oldValue: {
          title: milestone.title,
          status: milestone.status,
          deletedAt: milestone.deletedAt,
        },
        newValue: {
          deletedAt: "SERVER_TIMESTAMP",
        },
      });

      transaction.update(milestoneRef, {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      transaction.set(auditLog.ref, auditLog.data);

      return milestone;
    },
  );

  return {
    ...oldMilestone,
    deletedAt: new Date(),
  };
}
