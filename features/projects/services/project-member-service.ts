import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

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
  status: ProjectMemberStatus;
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
};

type EmployeeSnapshot = {
  id: string;
  fullName: string;
  userId: string | null;
};
type SyncProjectPicMemberParams = {
  actor: CurrentUser;
  projectId: string;
  projectName: string;
  projectCode: string;
  employeeId: string;
  employeeName: string;
  userId: string | null;
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

async function getEmployeeSnapshotOrThrow(
  employeeId: string,
): Promise<EmployeeSnapshot> {
  const employeeSnap = await getDb()
    .collection(COLLECTIONS.employees)
    .doc(employeeId)
    .get();

  if (!employeeSnap.exists) {
    throw new AppError("Employee tidak ditemukan.", 404, "EMPLOYEE_NOT_FOUND");
  }

  const employee = employeeSnap.data() ?? {};

  if (employee.deletedAt) {
    throw new AppError("Employee sudah dihapus.", 400, "EMPLOYEE_DELETED");
  }

  if (employee.status !== "ACTIVE") {
    throw new AppError(
      "Employee project member harus berstatus ACTIVE.",
      400,
      "EMPLOYEE_NOT_ACTIVE",
    );
  }

  return {
    id: employeeSnap.id,
    fullName: String(employee.fullName ?? ""),
    userId: employee.userId ?? null,
  };
}

async function getProjectMemberDocumentOrThrow(
  id: string,
): Promise<ProjectMemberDetail> {
  const memberSnap = await getDb()
    .collection(COLLECTIONS.projectMembers)
    .doc(id)
    .get();

  if (!memberSnap.exists) {
    throw new AppError(
      "Project member tidak ditemukan.",
      404,
      "PROJECT_MEMBER_NOT_FOUND",
    );
  }

  return normalizeProjectMemberDocument(memberSnap.id, memberSnap.data() ?? {});
}

async function assertActiveProjectMemberUnique(
  projectId: string,
  employeeId: string,
  ignoredMemberId?: string,
): Promise<void> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.projectMembers)
    .where("projectId", "==", projectId)
    .where("employeeId", "==", employeeId)
    .where("status", "==", "ACTIVE")
    .limit(1)
    .get();

  if (querySnap.empty) {
    return;
  }

  const existingDoc = querySnap.docs[0];

  if (existingDoc.id !== ignoredMemberId) {
    throw new AppError(
      "Employee ini sudah menjadi active member di project tersebut.",
      409,
      "PROJECT_MEMBER_ALREADY_ACTIVE",
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
  const member = await getProjectMemberDocumentOrThrow(id);

  if (member.deletedAt) {
    throw new AppError(
      "Project member sudah dihapus.",
      404,
      "PROJECT_MEMBER_DELETED",
    );
  }

  return member;
}

export async function addProjectMemberService({
  actor,
  projectId,
  employeeId,
  role,
}: AddProjectMemberParams): Promise<ProjectMemberDetail> {
  const [project, employee] = await Promise.all([
    getProjectSnapshotOrThrow(projectId),
    getEmployeeSnapshotOrThrow(employeeId),
  ]);

  await assertActiveProjectMemberUnique(project.id, employee.id);

  const memberId = createDocumentId("projectMembers");

  await getDb().collection(COLLECTIONS.projectMembers).doc(memberId).set({
    id: memberId,
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });

  await writeAuditLog({
    user: actor,
    action: "PROJECT_MEMBER_ADDED",
    module: "project_member",
    entityId: memberId,
    entityType: "projectMember",
    oldValue: null,
    newValue: {
      id: memberId,
      projectId: project.id,
      projectName: project.name,
      employeeId: employee.id,
      employeeName: employee.fullName,
      userId: employee.userId,
      role,
      status: "ACTIVE",
    },
  });

  return getProjectMemberByIdService(memberId);
}

export async function updateProjectMemberService({
  actor,
  id,
  role,
  status,
}: UpdateProjectMemberParams): Promise<ProjectMemberDetail> {
  const oldMember = await getProjectMemberByIdService(id);

  if (status === "ACTIVE") {
    await assertActiveProjectMemberUnique(
      oldMember.projectId,
      oldMember.employeeId,
      id,
    );
  }

  await getDb()
    .collection(COLLECTIONS.projectMembers)
    .doc(id)
    .update({
      role,
      status,
      leftAt: status === "ACTIVE" ? null : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
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

  return getProjectMemberByIdService(id);
}

export async function removeProjectMemberService({
  actor,
  id,
}: RemoveProjectMemberParams): Promise<ProjectMemberDetail> {
  const oldMember = await getProjectMemberByIdService(id);

  await getDb().collection(COLLECTIONS.projectMembers).doc(id).update({
    status: "REMOVED",
    leftAt: serverTimestamp(),
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
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

  return {
    ...oldMember,
    status: "REMOVED",
    leftAt: new Date(),
    deletedAt: new Date(),
  };
}

export async function syncProjectPicAsMemberService({
  actor,
  projectId,
  projectName,
  projectCode,
  employeeId,
  employeeName,
  userId,
}: SyncProjectPicMemberParams): Promise<ProjectMemberDetail> {
  const existingSnap = await getDb()
    .collection(COLLECTIONS.projectMembers)
    .where("projectId", "==", projectId)
    .where("employeeId", "==", employeeId)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    const existingMember = normalizeProjectMemberDocument(
      existingDoc.id,
      existingDoc.data(),
    );

    await getDb()
      .collection(COLLECTIONS.projectMembers)
      .doc(existingDoc.id)
      .update({
        projectName,
        projectCode,
        employeeName,
        userId,
        role: "PROJECT_MANAGER",
        status: "ACTIVE",
        leftAt: null,
        deletedAt: null,
        updatedAt: serverTimestamp(),
      });

    await writeAuditLog({
      user: actor,
      action: "PROJECT_PIC_MEMBER_SYNCED",
      module: "project_member",
      entityId: existingDoc.id,
      entityType: "projectMember",
      oldValue: {
        role: existingMember.role,
        status: existingMember.status,
        deletedAt: existingMember.deletedAt,
      },
      newValue: {
        projectId,
        employeeId,
        role: "PROJECT_MANAGER",
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    return getProjectMemberByIdService(existingDoc.id);
  }

  const memberId = createDocumentId("projectMembers");

  await getDb().collection(COLLECTIONS.projectMembers).doc(memberId).set({
    id: memberId,
    projectId,
    projectName,
    projectCode,
    employeeId,
    employeeName,
    userId,
    role: "PROJECT_MANAGER",
    status: "ACTIVE",
    joinedAt: serverTimestamp(),
    leftAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });

  await writeAuditLog({
    user: actor,
    action: "PROJECT_PIC_MEMBER_SYNCED",
    module: "project_member",
    entityId: memberId,
    entityType: "projectMember",
    oldValue: null,
    newValue: {
      id: memberId,
      projectId,
      projectName,
      projectCode,
      employeeId,
      employeeName,
      userId,
      role: "PROJECT_MANAGER",
      status: "ACTIVE",
    },
  });

  return getProjectMemberByIdService(memberId);
}
