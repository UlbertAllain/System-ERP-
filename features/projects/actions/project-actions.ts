"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { ProjectDetail, ProjectListItem } from "@/types/project";
import {
  createProjectService,
  deleteProjectService,
  getProjectByIdService,
  listProjectsService,
  restoreProjectService,
  updateProjectService,
} from "@/features/projects/services/project-service";
import {
  createProjectSchema,
  listProjectsSchema,
  projectIdSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type ListProjectsInput,
  type ProjectIdInput,
  type UpdateProjectInput,
} from "@/features/projects/schemas/project-schema";
import {
  canAccessProject,
  filterProjectsForUser,
} from "@/features/projects/actions/project-access-scope";

function revalidateProjectPaths() {
  revalidatePath("/projects");
}

export async function listProjectsAction(
  input: ListProjectsInput = {},
): Promise<ActionResponse<ProjectListItem[]>> {
  try {
    listProjectsSchema.parse(input);

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
