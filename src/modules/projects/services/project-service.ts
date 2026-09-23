import "server-only";

import { createHash } from "crypto";
import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { getAuditLogDocument } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import type { PaginatedResult } from "@/types/common";
import type { CurrentUser } from "@/types/auth";
import type {
  ProjectBillingType,
  ProjectDetail,
  ProjectListItem,
  ProjectPriority,
  ProjectStatus,
} from "@/types/project";

import {
  normalizeNullableString,
  normalizeSearchText,
  dateStringToTimestamp,
} from "@/lib/domain/firestore-value";
import { assertValidProjectStatusTransition } from "@/modules/projects/projects/project-domain";
import {
  findProjectById,
  listProjects,
  listProjectsPaginated,
  normalizeProjectDocument,
} from "@/features/projects/repositories/project-repository";
type CreateProjectParams = {
  actor: CurrentUser;
  projectCode: string;
  name: string;
  description?: string | null;
  clientId: string;
  picEmployeeId: string;
  priority: ProjectPriority;
  billingType: ProjectBillingType;
  budget: number;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
};

type UpdateProjectParams = CreateProjectParams & {
  id: string;
  status: ProjectStatus;
};

type ProjectIdParams = {
  actor: CurrentUser;
  id: string;
};

type ListProjectsPaginatedParams = {
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  page: number;
  pageSize: number;
};

type ClientSnapshot = {
  id: string;
  name: string;
  company: string | null;
};

type EmployeeSnapshot = {
  id: string;
  fullName: string;
  userId: string | null;
};

function normalizeProjectCode(projectCode: string): string {
  return projectCode.trim().toUpperCase();
}

function getProjectCodeLockId(projectCode: string): string {
  return createHash("sha256")
    .update(normalizeProjectCode(projectCode))
    .digest("hex");
}

function assertValidProjectDateRange(
  startDate: string,
  endDate?: string | null,
): void {
  if (!endDate) {
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  if (end.getTime() < start.getTime()) {
    throw new AppError(
      "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      400,
      "INVALID_PROJECT_DATE_RANGE",
    );
  }
}

async function assertProjectCodeUnique(
  projectCode: string,
  ignoredProjectId?: string,
): Promise<void> {
  const normalizedCode = normalizeProjectCode(projectCode);

  const querySnap = await getDb()
    .collection(COLLECTIONS.projects)
    .where("projectCode", "==", normalizedCode)
    .limit(1)
    .get();

  if (querySnap.empty) {
    return;
  }

  const existingDoc = querySnap.docs[0];

  if (existingDoc.id !== ignoredProjectId) {
    throw new AppError(
      "Kode project sudah digunakan.",
      409,
      "PROJECT_CODE_ALREADY_USED",
    );
  }
}

function normalizeClientSnapshotOrThrow(
  clientSnap: DocumentSnapshot<DocumentData>,
): ClientSnapshot {
  if (!clientSnap.exists) {
    throw new AppError("Client tidak ditemukan.", 404, "CLIENT_NOT_FOUND");
  }

  const client = clientSnap.data() ?? {};

  if (client.deletedAt) {
    throw new AppError("Client sudah dihapus.", 400, "CLIENT_DELETED");
  }

  if (client.status === "ARCHIVED") {
    throw new AppError("Client sudah diarsipkan.", 400, "CLIENT_ARCHIVED");
  }

  return {
    id: clientSnap.id,
    name: String(client.name ?? ""),
    company: client.company ?? null,
  };
}

function normalizeEmployeeSnapshotOrThrow(
  employeeSnap: DocumentSnapshot<DocumentData>,
): EmployeeSnapshot {
  if (!employeeSnap.exists) {
    throw new AppError("PIC employee tidak ditemukan.", 404, "PIC_NOT_FOUND");
  }

  const employee = employeeSnap.data() ?? {};

  if (employee.deletedAt) {
    throw new AppError("PIC employee sudah dihapus.", 400, "PIC_DELETED");
  }

  if (employee.status !== "ACTIVE") {
    throw new AppError(
      "PIC project harus employee dengan status ACTIVE.",
      400,
      "PIC_NOT_ACTIVE",
    );
  }

  return {
    id: employeeSnap.id,
    fullName: String(employee.fullName ?? ""),
    userId: employee.userId ?? null,
  };
}

async function getProjectDocumentOrThrow(id: string): Promise<ProjectDetail> {
  const project = await findProjectById(id);

  if (!project) {
    throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
  }

  return project;
}

export async function listProjectsService(): Promise<ProjectListItem[]> {
  return listProjects();
}

export async function listProjectsPaginatedService(
  input: ListProjectsPaginatedParams,
): Promise<PaginatedResult<ProjectListItem>> {
  return listProjectsPaginated(input);
}

export async function getProjectByIdService(
  id: string,
): Promise<ProjectDetail> {
  const project = await getProjectDocumentOrThrow(id);

  if (project.deletedAt) {
    throw new AppError("Project sudah dihapus.", 404, "PROJECT_DELETED");
  }

  return project;
}

export async function createProjectService({
  actor,
  projectCode,
  name,
  description,
  clientId,
  picEmployeeId,
  priority,
  billingType,
  budget,
  startDate,
  endDate,
  notes,
}: CreateProjectParams): Promise<ProjectDetail> {
  const normalizedCode = normalizeProjectCode(projectCode);
  assertValidProjectDateRange(startDate, endDate);
  // Menjaga kompatibilitas data lama yang belum memiliki projectCodeLocks.
  await assertProjectCodeUnique(normalizedCode);

  const db = getDb();
  const projectId = createDocumentId("projects");
  const memberId = createHash("sha256")
    .update(`${projectId}:${picEmployeeId}`)
    .digest("hex");
  const projectName = name.trim();
  const projectRef = db.collection(COLLECTIONS.projects).doc(projectId);
  const memberRef = db.collection(COLLECTIONS.projectMembers).doc(memberId);
  const codeLockRef = db
    .collection(COLLECTIONS.projectCodeLocks)
    .doc(getProjectCodeLockId(normalizedCode));
  const clientRef = db.collection(COLLECTIONS.clients).doc(clientId);
  const employeeRef = db.collection(COLLECTIONS.employees).doc(picEmployeeId);

  await db.runTransaction(async (transaction) => {
    const [codeLockSnap, clientSnap, employeeSnap] = await Promise.all([
      transaction.get(codeLockRef),
      transaction.get(clientRef),
      transaction.get(employeeRef),
    ]);

    if (codeLockSnap.exists) {
      throw new AppError(
        "Kode project sudah digunakan.",
        409,
        "PROJECT_CODE_ALREADY_USED",
      );
    }

    const client = normalizeClientSnapshotOrThrow(clientSnap);
    const pic = normalizeEmployeeSnapshotOrThrow(employeeSnap);
    const projectAudit = getAuditLogDocument({
      user: actor,
      action: "PROJECT_CREATED",
      module: "project",
      entityId: projectId,
      entityType: "project",
      oldValue: null,
      newValue: {
        id: projectId,
        projectCode: normalizedCode,
        name: projectName,
        clientId: client.id,
        picEmployeeId: pic.id,
        status: "PLANNING",
        priority,
        billingType,
        budget,
      },
    });
    const memberAudit = getAuditLogDocument({
      user: actor,
      action: "PROJECT_PIC_MEMBER_SYNCED",
      module: "project_member",
      entityId: memberId,
      entityType: "projectMember",
      oldValue: null,
      newValue: {
        id: memberId,
        projectId,
        employeeId: pic.id,
        role: "PROJECT_MANAGER",
        status: "ACTIVE",
      },
    });

    transaction.set(projectRef, {
      id: projectId,
      projectCode: normalizedCode,
      name: projectName,
      description: normalizeNullableString(description),
      clientId: client.id,
      clientName: client.name,
      clientCompany: client.company,
      picUserId: pic.userId,
      picEmployeeId: pic.id,
      picName: pic.fullName,
      status: "PLANNING",
      priority,
      billingType,
      budget,
      startDate: dateStringToTimestamp(startDate),
      endDate: dateStringToTimestamp(endDate),
      thumbnail: null,
      searchText: normalizeSearchText(
        normalizedCode,
        projectName,
        client.name,
        client.company,
        pic.fullName,
      ),
      notes: normalizeNullableString(notes),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });
    transaction.set(memberRef, {
      id: memberId,
      projectId,
      projectName,
      projectCode: normalizedCode,
      employeeId: pic.id,
      employeeName: pic.fullName,
      userId: pic.userId,
      role: "PROJECT_MANAGER",
      status: "ACTIVE",
      joinedAt: serverTimestamp(),
      leftAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });
    transaction.set(codeLockRef, {
      projectId,
      projectCode: normalizedCode,
      createdAt: serverTimestamp(),
    });
    transaction.set(projectAudit.ref, projectAudit.data);
    transaction.set(memberAudit.ref, memberAudit.data);
  });

  return getProjectByIdService(projectId);
}

export async function updateProjectService({
  actor,
  id,
  projectCode,
  name,
  description,
  clientId,
  picEmployeeId,
  status,
  priority,
  billingType,
  budget,
  startDate,
  endDate,
  notes,
}: UpdateProjectParams): Promise<ProjectDetail> {
  const normalizedCode = normalizeProjectCode(projectCode);
  assertValidProjectDateRange(startDate, endDate);
  // Menjaga kompatibilitas data lama yang belum memiliki projectCodeLocks.
  await assertProjectCodeUnique(normalizedCode, id);

  if (status === "ARCHIVED") {
    throw new AppError(
      "Gunakan aksi arsipkan proyek agar seluruh relasi aktif diperiksa.",
      409,
      "PROJECT_ARCHIVE_REQUIRES_ARCHIVE_ACTION",
    );
  }

  const db = getDb();
  const projectRef = db.collection(COLLECTIONS.projects).doc(id);
  const clientRef = db.collection(COLLECTIONS.clients).doc(clientId);
  const employeeRef = db.collection(COLLECTIONS.employees).doc(picEmployeeId);
  const projectName = name.trim();

  await db.runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);

    if (!projectSnap.exists) {
      throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
    }

    const oldProject = normalizeProjectDocument(
      projectSnap.id,
      projectSnap.data() ?? {},
    );

    if (oldProject.deletedAt) {
      throw new AppError("Project sudah dihapus.", 404, "PROJECT_DELETED");
    }

    assertValidProjectStatusTransition(oldProject.status, status);

    const codeChanged = oldProject.projectCode !== normalizedCode;
    const newCodeLockRef = db
      .collection(COLLECTIONS.projectCodeLocks)
      .doc(getProjectCodeLockId(normalizedCode));
    const oldCodeLockRef = db
      .collection(COLLECTIONS.projectCodeLocks)
      .doc(getProjectCodeLockId(oldProject.projectCode));
    const memberQuery = db
      .collection(COLLECTIONS.projectMembers)
      .where("projectId", "==", id)
      .where("employeeId", "==", picEmployeeId)
      .limit(1);
    const requiresTerminalValidation =
      status === "COMPLETED" || status === "CANCELLED";
    const openTasksQuery = db
      .collection(COLLECTIONS.tasks)
      .where("projectId", "==", id)
      .where("deletedAt", "==", null)
      .where("status", "in", ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"])
      .limit(1);
    const activeMilestonesQuery = db
      .collection(COLLECTIONS.milestones)
      .where("projectId", "==", id)
      .where("deletedAt", "==", null)
      .where("status", "in", ["PLANNED", "IN_PROGRESS", "ON_HOLD"])
      .limit(1);
    const activeInvoicesQuery = db
      .collection(COLLECTIONS.invoices)
      .where("projectId", "==", id)
      .where("deletedAt", "==", null)
      .where("status", "in", ["DRAFT", "ISSUED", "PARTIALLY_PAID", "OVERDUE"])
      .limit(1);

    const [
      clientSnap,
      employeeSnap,
      newCodeLockSnap,
      oldCodeLockSnap,
      existingMemberSnap,
      openTasksSnap,
      activeMilestonesSnap,
      activeInvoicesSnap,
    ] = await Promise.all([
      transaction.get(clientRef),
      transaction.get(employeeRef),
      transaction.get(newCodeLockRef),
      codeChanged ? transaction.get(oldCodeLockRef) : Promise.resolve(null),
      transaction.get(memberQuery),
      requiresTerminalValidation
        ? transaction.get(openTasksQuery)
        : Promise.resolve(null),
      requiresTerminalValidation
        ? transaction.get(activeMilestonesQuery)
        : Promise.resolve(null),
      requiresTerminalValidation
        ? transaction.get(activeInvoicesQuery)
        : Promise.resolve(null),
    ]);

    if (
      newCodeLockSnap.exists &&
      newCodeLockSnap.data()?.projectId !== id
    ) {
      throw new AppError(
        "Kode project sudah digunakan.",
        409,
        "PROJECT_CODE_ALREADY_USED",
      );
    }

    const client = normalizeClientSnapshotOrThrow(clientSnap);
    const pic = normalizeEmployeeSnapshotOrThrow(employeeSnap);
    const memberRef = existingMemberSnap.empty
      ? db
          .collection(COLLECTIONS.projectMembers)
          .doc(
            createHash("sha256")
              .update(`${id}:${pic.id}`)
              .digest("hex"),
          )
      : existingMemberSnap.docs[0].ref;
    const previousMember = existingMemberSnap.empty
      ? null
      : existingMemberSnap.docs[0].data();

    if (requiresTerminalValidation) {
      if (openTasksSnap && !openTasksSnap.empty) {
        throw new AppError(
          "Proyek masih memiliki tugas aktif. Selesaikan atau batalkan tugas terlebih dahulu.",
          409,
          "PROJECT_HAS_ACTIVE_TASKS",
        );
      }

      if (activeMilestonesSnap && !activeMilestonesSnap.empty) {
        throw new AppError(
          "Proyek masih memiliki milestone aktif. Selesaikan atau batalkan milestone terlebih dahulu.",
          409,
          "PROJECT_HAS_ACTIVE_MILESTONES",
        );
      }

      if (activeInvoicesSnap && !activeInvoicesSnap.empty) {
        throw new AppError(
          "Proyek masih memiliki invoice yang belum selesai.",
          409,
          "PROJECT_HAS_ACTIVE_INVOICES",
        );
      }
    }

    const projectAudit = getAuditLogDocument({
      user: actor,
      action: "PROJECT_UPDATED",
      module: "project",
      entityId: id,
      entityType: "project",
      oldValue: {
        projectCode: oldProject.projectCode,
        name: oldProject.name,
        clientId: oldProject.clientId,
        picEmployeeId: oldProject.picEmployeeId,
        status: oldProject.status,
        priority: oldProject.priority,
        billingType: oldProject.billingType,
        budget: oldProject.budget,
      },
      newValue: {
        projectCode: normalizedCode,
        name: projectName,
        clientId: client.id,
        picEmployeeId: pic.id,
        status,
        priority,
        billingType,
        budget,
      },
    });
    const memberAudit = getAuditLogDocument({
      user: actor,
      action: "PROJECT_PIC_MEMBER_SYNCED",
      module: "project_member",
      entityId: memberRef.id,
      entityType: "projectMember",
      oldValue: previousMember,
      newValue: {
        projectId: id,
        employeeId: pic.id,
        role: "PROJECT_MANAGER",
        status: "ACTIVE",
      },
    });

    transaction.update(projectRef, {
      projectCode: normalizedCode,
      name: projectName,
      description: normalizeNullableString(description),
      clientId: client.id,
      clientName: client.name,
      clientCompany: client.company,
      picUserId: pic.userId,
      picEmployeeId: pic.id,
      picName: pic.fullName,
      status,
      priority,
      billingType,
      budget,
      startDate: dateStringToTimestamp(startDate),
      endDate: dateStringToTimestamp(endDate),
      searchText: normalizeSearchText(
        normalizedCode,
        projectName,
        client.name,
        client.company,
        pic.fullName,
      ),
      notes: normalizeNullableString(notes),
      updatedAt: serverTimestamp(),
    });

    transaction.set(
      memberRef,
      {
        id: memberRef.id,
        projectId: id,
        projectName,
        projectCode: normalizedCode,
        employeeId: pic.id,
        employeeName: pic.fullName,
        userId: pic.userId,
        role: "PROJECT_MANAGER",
        status: "ACTIVE",
        joinedAt: previousMember?.joinedAt ?? serverTimestamp(),
        leftAt: null,
        createdAt: previousMember?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      },
      { merge: true },
    );

    if (codeChanged || !newCodeLockSnap.exists) {
      transaction.set(newCodeLockRef, {
        projectId: id,
        projectCode: normalizedCode,
        createdAt: serverTimestamp(),
      });
    }

    if (
      codeChanged &&
      oldCodeLockSnap?.exists &&
      oldCodeLockSnap.data()?.projectId === id
    ) {
      transaction.delete(oldCodeLockRef);
    }

    transaction.set(projectAudit.ref, projectAudit.data);
    transaction.set(memberAudit.ref, memberAudit.data);
  });

  return getProjectByIdService(id);
}

export async function deleteProjectService({
  actor,
  id,
}: ProjectIdParams): Promise<ProjectDetail> {
  const db = getDb();
  const projectRef = db.collection(COLLECTIONS.projects).doc(id);
  const openTasksQuery = db
    .collection(COLLECTIONS.tasks)
    .where("projectId", "==", id)
    .where("deletedAt", "==", null)
    .where("status", "in", ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"])
    .limit(1);
  const activeMilestonesQuery = db
    .collection(COLLECTIONS.milestones)
    .where("projectId", "==", id)
    .where("deletedAt", "==", null)
    .where("status", "in", ["PLANNED", "IN_PROGRESS", "ON_HOLD"])
    .limit(1);
  const activeInvoicesQuery = db
    .collection(COLLECTIONS.invoices)
    .where("projectId", "==", id)
    .where("deletedAt", "==", null)
    .where("status", "in", ["DRAFT", "ISSUED", "PARTIALLY_PAID", "OVERDUE"])
    .limit(1);

  const archivedProject = await db.runTransaction(async (transaction) => {
    const [projectSnap, openTasks, activeMilestones, activeInvoices] =
      await Promise.all([
        transaction.get(projectRef),
        transaction.get(openTasksQuery),
        transaction.get(activeMilestonesQuery),
        transaction.get(activeInvoicesQuery),
      ]);

    if (!projectSnap.exists) {
      throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
    }

    const oldProject = normalizeProjectDocument(
      projectSnap.id,
      projectSnap.data() ?? {},
    );

    if (oldProject.deletedAt) {
      throw new AppError("Project sudah dihapus.", 404, "PROJECT_DELETED");
    }

    if (!openTasks.empty) {
      throw new AppError(
        "Project masih memiliki tugas aktif. Selesaikan atau batalkan tugas terlebih dahulu.",
        409,
        "PROJECT_HAS_ACTIVE_TASKS",
      );
    }

    if (!activeMilestones.empty) {
      throw new AppError(
        "Project masih memiliki milestone aktif. Selesaikan atau batalkan milestone terlebih dahulu.",
        409,
        "PROJECT_HAS_ACTIVE_MILESTONES",
      );
    }

    if (!activeInvoices.empty) {
      throw new AppError(
        "Project masih memiliki invoice yang belum selesai.",
        409,
        "PROJECT_HAS_ACTIVE_INVOICES",
      );
    }

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "PROJECT_DELETED",
      module: "project",
      entityId: id,
      entityType: "project",
      oldValue: {
        status: oldProject.status,
        deletedAt: oldProject.deletedAt,
      },
      newValue: {
        status: "ARCHIVED",
        deletedAt: "SERVER_TIMESTAMP",
      },
    });

    transaction.update(projectRef, {
      status: "ARCHIVED",
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);

    return oldProject;
  });

  return {
    ...archivedProject,
    status: "ARCHIVED",
    deletedAt: new Date(),
  };
}

export async function restoreProjectService({
  actor,
  id,
}: ProjectIdParams): Promise<ProjectDetail> {
  const db = getDb();
  const projectRef = db.collection(COLLECTIONS.projects).doc(id);

  await db.runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);

    if (!projectSnap.exists) {
      throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
    }

    const oldProject = normalizeProjectDocument(
      projectSnap.id,
      projectSnap.data() ?? {},
    );
    const codeLockRef = db
      .collection(COLLECTIONS.projectCodeLocks)
      .doc(getProjectCodeLockId(oldProject.projectCode));
    const codeLockSnap = await transaction.get(codeLockRef);

    if (
      codeLockSnap.exists &&
      codeLockSnap.data()?.projectId !== id
    ) {
      throw new AppError(
        "Kode project sudah dipakai project lain dan project ini tidak dapat dipulihkan.",
        409,
        "PROJECT_CODE_ALREADY_USED",
      );
    }

    transaction.update(projectRef, {
      status: "PLANNING",
      deletedAt: null,
      updatedAt: serverTimestamp(),
    });
    transaction.set(
      codeLockRef,
      {
        projectId: id,
        projectCode: oldProject.projectCode,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "PROJECT_RESTORED",
      module: "project",
      entityId: id,
      entityType: "project",
      oldValue: {
        status: oldProject.status,
        deletedAt: oldProject.deletedAt,
      },
      newValue: {
        status: "PLANNING",
        deletedAt: null,
      },
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getProjectByIdService(id);
}
