"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
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
} from "@/features/projects/services/project-member-service";
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
} from "@/features/projects/schemas/project-member-schema";

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

    return successResponse("Project members berhasil dimuat.", members);
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

    requirePermission(auth.user, "project_member.create");

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

    requirePermission(auth.user, "project_member.delete");

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
