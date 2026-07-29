import "server-only";

import { createHash } from "node:crypto";
import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";

import { getAuditLogDocument } from "@/lib/audit/audit-log";
import { timestampToDate } from "@/lib/domain/firestore-value";
import { AppError } from "@/lib/errors/app-error";
import {
  COLLECTIONS,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import type { CurrentUser } from "@/types/auth";
import type {
  ProjectMemberDetail,
  ProjectMemberListItem,
  ProjectMemberRole,
  ProjectMemberStatus,
} from "@/types/project-member";

type AddProjectMemberParams = {
  actor: CurrentUser;
  projectId: string;
  employeeId: string;
  role: ProjectMemberRole;
};

type UpdateProjectMemberParams = {
  actor: CurrentUser;
  id: string;
  role: ProjectMemberRole;
  status: Exclude<ProjectMemberStatus, "REMOVED">;
};

type RemoveProjectMemberParams = {
  actor: CurrentUser;
  id: string;
};

type ListProjectMembersParams = {
  projectId?: string;
};

type ProjectSnapshot = {
  id: string;
  name: string;
  projectCode: string;
  picEmployeeId: string | null;
};

type EmployeeSnapshot = {
  id: string;
  fullName: string;
  userId: string | null;
};

function normalizeProjectMemberDocument(
  id: string,
  data: DocumentData,
): ProjectMemberListItem {
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

function normalizeProjectSnapshotOrThrow(
  projectSnap: DocumentSnapshot<DocumentData>,
): ProjectSnapshot {
  if (!projectSnap.exists) {
    throw new AppError("Proyek tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
  }

  const project = projectSnap.data() ?? {};

  if (
    project.deletedAt ||
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
    picEmployeeId:
      typeof project.picEmployeeId === "string" && project.picEmployeeId
        ? project.picEmployeeId
        : null,
  };
}

function normalizeEmployeeSnapshotOrThrow(
  employeeSnap: DocumentSnapshot<DocumentData>,
): EmployeeSnapshot {
  if (!employeeSnap.exists) {
    throw new AppError("Karyawan tidak ditemukan.", 404, "EMPLOYEE_NOT_FOUND");
  }

  const employee = employeeSnap.data() ?? {};

  if (employee.deletedAt || employee.status !== "ACTIVE") {
    throw new AppError(
      "Anggota proyek harus merupakan karyawan aktif.",
      409,
      "EMPLOYEE_NOT_ACTIVE",
    );
  }

  return {
    id: employeeSnap.id,
    fullName: String(employee.fullName ?? ""),
    userId: employee.userId ?? null,
  };
}

function normalizeMemberSnapshotOrThrow(
  memberSnap: DocumentSnapshot<DocumentData>,
): ProjectMemberDetail {
  if (!memberSnap.exists) {
    throw new AppError(
      "Anggota proyek tidak ditemukan.",
      404,
      "PROJECT_MEMBER_NOT_FOUND",
    );
  }

  const member = normalizeProjectMemberDocument(
    memberSnap.id,
    memberSnap.data() ?? {},
  );

  if (member.deletedAt) {
    throw new AppError(
      "Anggota proyek sudah dihapus.",
      404,
      "PROJECT_MEMBER_DELETED",
    );
  }

  return member;
}

function getDeterministicMemberId(projectId: string, employeeId: string): string {
  return createHash("sha256")
    .update(`${projectId}:${employeeId}`)
    .digest("hex");
}

function assertPicMembershipMayChange(
  project: ProjectSnapshot,
  member: ProjectMemberDetail,
): void {
  if (project.picEmployeeId === member.employeeId) {
    throw new AppError(
      "PIC utama tidak dapat dinonaktifkan atau dihapus dari anggota proyek. Ganti PIC melalui form proyek terlebih dahulu.",
      409,
      "PROJECT_PIC_MEMBERSHIP_LOCKED",
    );
  }
}

export async function listProjectMembersService({
  projectId,
}: ListProjectMembersParams = {}): Promise<ProjectMemberListItem[]> {
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

export async function getProjectMemberByIdService(
  id: string,
): Promise<ProjectMemberDetail> {
  const memberSnap = await getDb()
    .collection(COLLECTIONS.projectMembers)
    .doc(id)
    .get();

  return normalizeMemberSnapshotOrThrow(memberSnap);
}

export async function addProjectMemberService({
  actor,
  projectId,
  employeeId,
  role,
}: AddProjectMemberParams): Promise<ProjectMemberDetail> {
  const db = getDb();
  const projectRef = db.collection(COLLECTIONS.projects).doc(projectId);
  const employeeRef = db.collection(COLLECTIONS.employees).doc(employeeId);
  const existingMemberQuery = db
    .collection(COLLECTIONS.projectMembers)
    .where("projectId", "==", projectId)
    .where("employeeId", "==", employeeId)
    .limit(5);

  const memberId = await db.runTransaction(async (transaction) => {
    const [projectSnap, employeeSnap, existingMemberSnap] = await Promise.all([
      transaction.get(projectRef),
      transaction.get(employeeRef),
      transaction.get(existingMemberQuery),
    ]);
    const project = normalizeProjectSnapshotOrThrow(projectSnap);
    const employee = normalizeEmployeeSnapshotOrThrow(employeeSnap);
    const activeMemberDoc = existingMemberSnap.docs.find((doc) => {
      const data = doc.data();
      return data.status === "ACTIVE" && !data.deletedAt;
    });

    if (activeMemberDoc) {
      throw new AppError(
        "Karyawan ini sudah menjadi anggota aktif pada proyek tersebut.",
        409,
        "PROJECT_MEMBER_ALREADY_ACTIVE",
      );
    }

    const reusableMemberDoc = existingMemberSnap.docs[0] ?? null;
    const resolvedMemberId =
      reusableMemberDoc?.id ?? getDeterministicMemberId(project.id, employee.id);
    const memberRef = db
      .collection(COLLECTIONS.projectMembers)
      .doc(resolvedMemberId);
    const oldMember = reusableMemberDoc
      ? normalizeProjectMemberDocument(
          reusableMemberDoc.id,
          reusableMemberDoc.data(),
        )
      : null;
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "PROJECT_MEMBER_ADDED",
      module: "project_member",
      entityId: resolvedMemberId,
      entityType: "projectMember",
      oldValue: oldMember,
      newValue: {
        projectId: project.id,
        employeeId: employee.id,
        role,
        status: "ACTIVE",
      },
    });

    transaction.set(
      memberRef,
      {
        id: resolvedMemberId,
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        employeeId: employee.id,
        employeeName: employee.fullName,
        userId: employee.userId,
        role,
        status: "ACTIVE",
        joinedAt: serverTimestamp(),
        leftAt: null,
        createdAt: reusableMemberDoc?.data()?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      },
      { merge: true },
    );
    transaction.set(auditLog.ref, auditLog.data);

    return resolvedMemberId;
  });

  return getProjectMemberByIdService(memberId);
}

export async function updateProjectMemberService({
  actor,
  id,
  role,
  status,
}: UpdateProjectMemberParams): Promise<ProjectMemberDetail> {
  const db = getDb();
  const memberRef = db.collection(COLLECTIONS.projectMembers).doc(id);

  await db.runTransaction(async (transaction) => {
    const memberSnap = await transaction.get(memberRef);
    const oldMember = normalizeMemberSnapshotOrThrow(memberSnap);
    const projectRef = db
      .collection(COLLECTIONS.projects)
      .doc(oldMember.projectId);
    const activeMemberQuery = db
      .collection(COLLECTIONS.projectMembers)
      .where("projectId", "==", oldMember.projectId)
      .where("employeeId", "==", oldMember.employeeId)
      .where("status", "==", "ACTIVE")
      .limit(5);
    const [projectSnap, activeMemberSnap] = await Promise.all([
      transaction.get(projectRef),
      transaction.get(activeMemberQuery),
    ]);
    const project = normalizeProjectSnapshotOrThrow(projectSnap);

    if (status !== "ACTIVE") {
      assertPicMembershipMayChange(project, oldMember);
    }

    if (
      status === "ACTIVE" &&
      activeMemberSnap.docs.some((doc) => doc.id !== id && !doc.data().deletedAt)
    ) {
      throw new AppError(
        "Karyawan ini sudah mempunyai keanggotaan aktif lain pada proyek tersebut.",
        409,
        "PROJECT_MEMBER_ALREADY_ACTIVE",
      );
    }

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "PROJECT_MEMBER_UPDATED",
      module: "project_member",
      entityId: id,
      entityType: "projectMember",
      oldValue: {
        role: oldMember.role,
        status: oldMember.status,
        leftAt: oldMember.leftAt,
      },
      newValue: {
        role,
        status,
        leftAt: status === "ACTIVE" ? null : "SERVER_TIMESTAMP",
      },
    });

    transaction.update(memberRef, {
      projectName: project.name,
      projectCode: project.projectCode,
      role,
      status,
      leftAt: status === "ACTIVE" ? null : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getProjectMemberByIdService(id);
}

export async function removeProjectMemberService({
  actor,
  id,
}: RemoveProjectMemberParams): Promise<ProjectMemberDetail> {
  const db = getDb();
  const memberRef = db.collection(COLLECTIONS.projectMembers).doc(id);
  const removedMember = await db.runTransaction(async (transaction) => {
    const memberSnap = await transaction.get(memberRef);
    const oldMember = normalizeMemberSnapshotOrThrow(memberSnap);
    const projectRef = db
      .collection(COLLECTIONS.projects)
      .doc(oldMember.projectId);
    const projectSnap = await transaction.get(projectRef);
    const project = normalizeProjectSnapshotOrThrow(projectSnap);
    assertPicMembershipMayChange(project, oldMember);

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "PROJECT_MEMBER_REMOVED",
      module: "project_member",
      entityId: id,
      entityType: "projectMember",
      oldValue: {
        role: oldMember.role,
        status: oldMember.status,
        deletedAt: oldMember.deletedAt,
      },
      newValue: {
        status: "REMOVED",
        leftAt: "SERVER_TIMESTAMP",
        deletedAt: "SERVER_TIMESTAMP",
      },
    });

    transaction.update(memberRef, {
      status: "REMOVED",
      leftAt: serverTimestamp(),
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);

    return oldMember;
  });

  return {
    ...removedMember,
    status: "REMOVED",
    leftAt: new Date(),
    deletedAt: new Date(),
  };
}
