"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { PaginatedResult } from "@/types/common";
import type { ProjectDetail, ProjectListItem } from "@/types/project";
import {
  createProjectService,
  deleteProjectService,
  getProjectByIdService,
  listProjectsPaginatedService,
  listProjectsService,
  restoreProjectService,
  updateProjectService,
} from "@/modules/projects/services/project-service";
import {
  createProjectSchema,
  listProjectsSchema,
  projectIdSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type ListProjectsInput,
  type ProjectIdInput,
  type UpdateProjectInput,
} from "@/modules/projects/schemas/project-schema";
import {
  canAccessProject,
  filterProjectsForUser,
  userHasOnlyAssignedProjectRead,
} from "@/modules/projects/actions/project-access-scope";

function revalidateProjectPaths() {
  revalidatePath("/projects");
}

export async function listProjectsAction(
  input: Partial<ListProjectsInput> = {},
): Promise<ActionResponse<ProjectListItem[]>> {
  try {
    listProjectsSchema.partial().parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "project.read",
      "project.read_all",
      "project.read_assigned",
    ]);

    const projects = await listProjectsService();
    const scopedProjects = await filterProjectsForUser(auth.user, projects);

    return successResponse("Projects berhasil dimuat.", scopedProjects);
  } catch (error) {
    return handleActionError(error);
  }
}

function paginateProjects(
  projects: ProjectListItem[],
  page: number,
  pageSize: number,
): PaginatedResult<ProjectListItem> {
  const totalItems = projects.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const offset = (page - 1) * pageSize;

  return {
    items: projects.slice(offset, offset + pageSize),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}

function filterProjectsByInput(
  projects: ProjectListItem[],
  input: ListProjectsInput,
) {
  const search = input.search?.trim().toLowerCase();

  return projects.filter((project) => {
    if (input.status && project.status !== input.status) {
      return false;
    }

    if (input.priority && project.priority !== input.priority) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      project.projectCode,
      project.name,
      project.clientName,
      project.clientCompany,
      project.picName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}

export async function listProjectsPaginatedAction(
  input: Partial<ListProjectsInput> = {},
): Promise<ActionResponse<PaginatedResult<ProjectListItem>>> {
  try {
    const payload = listProjectsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "project.read",
      "project.read_all",
      "project.read_assigned",
    ]);

    if (userHasOnlyAssignedProjectRead(auth.user)) {
      const projects = await listProjectsService();
      const scopedProjects = await filterProjectsForUser(auth.user, projects);
      const filteredProjects = filterProjectsByInput(scopedProjects, payload);

      return successResponse(
        "Projects berhasil dimuat.",
        paginateProjects(filteredProjects, payload.page, payload.pageSize),
      );
    }

    const projects = await listProjectsPaginatedService({
      search: payload.search,
      status: payload.status,
      priority: payload.priority,
      page: payload.page,
      pageSize: payload.pageSize,
    });

    return successResponse("Projects berhasil dimuat.", projects);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getProjectByIdAction(
  input: ProjectIdInput,
): Promise<ActionResponse<ProjectDetail>> {
  try {
    const payload = projectIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "project.read",
      "project.read_all",
      "project.read_assigned",
    ]);

    const project = await getProjectByIdService(payload.id);

    if (!(await canAccessProject(auth.user, project.id))) {
      return {
        success: false,
        message: "Akses ditolak untuk project ini.",
      };
    }

    return successResponse("Project berhasil dimuat.", project);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<ActionResponse<ProjectDetail>> {
  try {
    const payload = createProjectSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "project.create");

    const project = await createProjectService({
      actor: auth.user,
      ...payload,
    });

    revalidateProjectPaths();

    return successResponse("Project berhasil dibuat.", project);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateProjectAction(
  input: UpdateProjectInput,
): Promise<ActionResponse<ProjectDetail>> {
  try {
    const payload = updateProjectSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "project.update",
      "project.update_assigned",
    ]);

    if (
      auth.user.permissions.includes("project.update_assigned") &&
      !auth.user.permissions.includes("project.update") &&
      !(await canAccessProject(auth.user, payload.id))
    ) {
      return {
        success: false,
        message: "Akses ditolak untuk update project ini.",
      };
    }

    const project = await updateProjectService({
      actor: auth.user,
      ...payload,
    });

    revalidateProjectPaths();

    return successResponse("Project berhasil diperbarui.", project);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteProjectAction(
  input: ProjectIdInput,
): Promise<ActionResponse<ProjectDetail>> {
  try {
    const payload = projectIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "project.delete");

    const project = await deleteProjectService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateProjectPaths();

    return successResponse("Project berhasil dihapus.", project);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function restoreProjectAction(
  input: ProjectIdInput,
): Promise<ActionResponse<ProjectDetail>> {
  try {
    const payload = projectIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "project.restore");

    const project = await restoreProjectService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateProjectPaths();

    return successResponse("Project berhasil direstore.", project);
  } catch (error) {
    return handleActionError(error);
  }
}
