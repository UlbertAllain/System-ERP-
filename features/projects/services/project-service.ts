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
import { syncProjectPicAsMemberService } from "@/features/projects/services/project-member-service";
import type { PaginatedResult } from "@/types/common";
import type { CurrentUser } from "@/types/auth";
import type {
  ProjectBillingType,
  ProjectDetail,
  ProjectListItem,
  ProjectPriority,
  ProjectStatus,
} from "@/types/project";

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

function normalizeProjectCode(projectCode: string): string {
  return projectCode.trim().toUpperCase();
}

function normalizeSearchText(...values: Array<string | null | undefined>): string {
  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim()
    .toLowerCase();
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

function normalizeProjectDocument(
  id: string,
  data: DocumentData,
): ProjectListItem {
  return {
    id,
    projectCode: String(data.projectCode ?? ""),
    name: String(data.name ?? ""),
    description: data.description ?? null,
    clientId: String(data.clientId ?? ""),
    clientName: String(data.clientName ?? ""),
    clientCompany: data.clientCompany ?? null,

    picUserId: data.picUserId ?? null,
    picEmployeeId: data.picEmployeeId ?? null,
    picName: data.picName ?? null,

    status: data.status as ProjectStatus,
    priority: data.priority as ProjectPriority,
    billingType: data.billingType as ProjectBillingType,
    budget: Number(data.budget ?? 0),
    startDate: timestampToDate(data.startDate),
    endDate: timestampToDate(data.endDate),
    thumbnail: data.thumbnail ?? null,
    notes: data.notes ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
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

async function getClientSnapshotOrThrow(
  clientId: string,
): Promise<ClientSnapshot> {
  const clientSnap = await getDb()
    .collection(COLLECTIONS.clients)
    .doc(clientId)
    .get();

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

async function getEmployeeSnapshotOrThrow(
  employeeId: string,
): Promise<EmployeeSnapshot> {
  const employeeSnap = await getDb()
    .collection(COLLECTIONS.employees)
    .doc(employeeId)
    .get();

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
  const projectSnap = await getDb()
    .collection(COLLECTIONS.projects)
    .doc(id)
    .get();

  if (!projectSnap.exists) {
    throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
  }

  return normalizeProjectDocument(projectSnap.id, projectSnap.data() ?? {});
}

export async function listProjectsService(): Promise<ProjectListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.projects)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeProjectDocument(doc.id, doc.data()))
    .filter((project) => project.deletedAt === null);
}

export async function listProjectsPaginatedService({
  search,
  status,
  priority,
  page,
  pageSize,
}: ListProjectsPaginatedParams): Promise<PaginatedResult<ProjectListItem>> {
  const normalizedSearch = search?.trim().toLowerCase();
  const collection = getDb().collection(COLLECTIONS.projects);
  const offset = (page - 1) * pageSize;

  if (normalizedSearch) {
    const querySnap = await collection
      .orderBy("searchText")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .get();

    const matchedProjects = querySnap.docs
      .map((doc) => normalizeProjectDocument(doc.id, doc.data()))
      .filter((project) => project.deletedAt === null)
      .filter((project) => (status ? project.status === status : true))
      .filter((project) => (priority ? project.priority === priority : true));
    const totalItems = matchedProjects.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items: matchedProjects.slice(offset, offset + pageSize),
      totalItems,
      page,
      pageSize,
      totalPages,
    };
  }

  let baseQuery: FirebaseFirestore.Query = collection.where(
    "deletedAt",
    "==",
    null,
  );

  if (status) {
    baseQuery = baseQuery.where("status", "==", status);
  }

  if (priority) {
    baseQuery = baseQuery.where("priority", "==", priority);
  }

  const countSnap = await baseQuery.count().get();
  const totalItems = countSnap.data().count;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const querySnap = await baseQuery
    .orderBy("createdAt", "desc")
    .offset(offset)
    .limit(pageSize)
    .get();

  return {
    items: querySnap.docs.map((doc) =>
      normalizeProjectDocument(doc.id, doc.data()),
    ),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
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
  await assertProjectCodeUnique(normalizedCode);

  const [client, pic] = await Promise.all([
    getClientSnapshotOrThrow(clientId),
    getEmployeeSnapshotOrThrow(picEmployeeId),
  ]);

  const projectId = createDocumentId("projects");
  const projectName = name.trim();

  await getDb()
    .collection(COLLECTIONS.projects)
    .doc(projectId)
    .set({
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

  await writeAuditLog({
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
      clientName: client.name,
      picEmployeeId: pic.id,
      picUserId: pic.userId,
      picName: pic.fullName,
      status: "PLANNING",
      priority,
      billingType,
      budget,
    },
  });

  await syncProjectPicAsMemberService({
    actor,
    projectId,
    projectName,
    projectCode: normalizedCode,
    employeeId: pic.id,
    employeeName: pic.fullName,
    userId: pic.userId,
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
  const oldProject = await getProjectByIdService(id);
  const normalizedCode = normalizeProjectCode(projectCode);

  assertValidProjectDateRange(startDate, endDate);
  await assertProjectCodeUnique(normalizedCode, id);

  const [client, pic] = await Promise.all([
    getClientSnapshotOrThrow(clientId),
    getEmployeeSnapshotOrThrow(picEmployeeId),
  ]);

  const projectName = name.trim();

  await getDb()
    .collection(COLLECTIONS.projects)
    .doc(id)
    .update({
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

  await writeAuditLog({
    user: actor,
    action: "PROJECT_UPDATED",
    module: "project",
    entityId: id,
    entityType: "project",
    oldValue: {
      projectCode: oldProject.projectCode,
      name: oldProject.name,
      clientId: oldProject.clientId,
      clientName: oldProject.clientName,
      picEmployeeId: oldProject.picEmployeeId,
      picUserId: oldProject.picUserId,
      picName: oldProject.picName,
      status: oldProject.status,
      priority: oldProject.priority,
      billingType: oldProject.billingType,
      budget: oldProject.budget,
    },
    newValue: {
      projectCode: normalizedCode,
      name: projectName,
      clientId: client.id,
      clientName: client.name,
      picEmployeeId: pic.id,
      picUserId: pic.userId,
      picName: pic.fullName,
      status,
      priority,
      billingType,
      budget,
    },
  });

  await syncProjectPicAsMemberService({
    actor,
    projectId: id,
    projectName,
    projectCode: normalizedCode,
    employeeId: pic.id,
    employeeName: pic.fullName,
    userId: pic.userId,
  });

  return getProjectByIdService(id);
}

export async function deleteProjectService({
  actor,
  id,
}: ProjectIdParams): Promise<ProjectDetail> {
  const oldProject = await getProjectByIdService(id);

  await getDb().collection(COLLECTIONS.projects).doc(id).update({
    status: "ARCHIVED",
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
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

  return {
    ...oldProject,
    status: "ARCHIVED",
    deletedAt: new Date(),
  };
}

export async function restoreProjectService({
  actor,
  id,
}: ProjectIdParams): Promise<ProjectDetail> {
  const projectSnap = await getDb()
    .collection(COLLECTIONS.projects)
    .doc(id)
    .get();

  if (!projectSnap.exists) {
    throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
  }

  const oldProject = normalizeProjectDocument(
    projectSnap.id,
    projectSnap.data() ?? {},
  );

  await getDb().collection(COLLECTIONS.projects).doc(id).update({
    status: "PLANNING",
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
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

  return getProjectByIdService(id);
}
