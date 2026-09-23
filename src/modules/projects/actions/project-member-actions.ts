"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type {
  ProjectMemberDetail,
  ProjectMemberListItem,
} from "@/types/project-member";
import {
  addProjectMemberService,
  getProjectMemberByIdService,
  listProjectMembersService,
  removeProjectMemberService,
  updateProjectMemberService,
} from "@/modules/projects/services/project-member-service";
import {
  addProjectMemberSchema,
  listProjectMembersSchema,
  projectMemberIdSchema,
  removeProjectMemberSchema,
  updateProjectMemberSchema,
  type AddProjectMemberInput,
  type ListProjectMembersInput,
  type ProjectMemberIdInput,
  type RemoveProjectMemberInput,
  type UpdateProjectMemberInput,
} from "@/modules/projects/schemas/project-member-schema";
import {
  canAccessProjectForMutation,
  canAccessProjectMember,
  filterProjectMembersForUser,
} from "@/modules/projects/actions/project-access-scope";

function revalidateProjectMemberPaths() {
  revalidatePath("/projects");
  revalidatePath("/projects/members");
}

export async function listProjectMembersAction(
  input: ListProjectMembersInput = {},
): Promise<ActionResponse<ProjectMemberListItem[]>> {
  try {
    const payload = listProjectMembersSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "project_member.read");

    const members = await listProjectMembersService({
      projectId: payload.projectId,
    });
    const scopedMembers = await filterProjectMembersForUser(auth.user, members);

    return successResponse("Project members berhasil dimuat.", scopedMembers);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getProjectMemberByIdAction(
  input: ProjectMemberIdInput,
): Promise<ActionResponse<ProjectMemberDetail>> {
  try {
    const payload = projectMemberIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "project_member.read");

    const member = await getProjectMemberByIdService(payload.id);

    if (!(await canAccessProjectMember(auth.user, member))) {
      return {
        success: false,
        message: "Akses ditolak untuk project member ini.",
      };
    }

    return successResponse("Project member berhasil dimuat.", member);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function addProjectMemberAction(
  input: AddProjectMemberInput,
): Promise<ActionResponse<ProjectMemberDetail>> {
  try {
    const payload = addProjectMemberSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "project_member.create",
      "project_member.assign",
    ]);

    if (!(await canAccessProjectForMutation(auth.user, payload.projectId))) {
      return {
        success: false,
        message: "Akses ditolak untuk menambahkan member pada project ini.",
      };
    }

    const member = await addProjectMemberService({
      actor: auth.user,
      ...payload,
    });

    revalidateProjectMemberPaths();

    return successResponse("Project member berhasil ditambahkan.", member);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateProjectMemberAction(
  input: UpdateProjectMemberInput,
): Promise<ActionResponse<ProjectMemberDetail>> {
  try {
    const payload = updateProjectMemberSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "project_member.update");

    const existingMember = await getProjectMemberByIdService(payload.id);

    if (!(await canAccessProjectMember(auth.user, existingMember))) {
      return {
        success: false,
        message: "Akses ditolak untuk update project member ini.",
      };
    }

    const member = await updateProjectMemberService({
      actor: auth.user,
      ...payload,
    });

    revalidateProjectMemberPaths();

    return successResponse("Project member berhasil diperbarui.", member);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function removeProjectMemberAction(
  input: RemoveProjectMemberInput,
): Promise<ActionResponse<ProjectMemberDetail>> {
  try {
    const payload = removeProjectMemberSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "project_member.delete",
      "project_member.remove",
    ]);

    const existingMember = await getProjectMemberByIdService(payload.id);

    if (!(await canAccessProjectMember(auth.user, existingMember))) {
      return {
        success: false,
        message: "Akses ditolak untuk menghapus project member ini.",
      };
    }

    const member = await removeProjectMemberService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateProjectMemberPaths();

    return successResponse("Project member berhasil dihapus.", member);
  } catch (error) {
    return handleActionError(error);
  }
}
