"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type {
  PermissionListItem,
  RoleListItem,
  RolePermissionEditorData,
} from "@/types/role";
import {
  getRolePermissionEditorDataService,
  listPermissionsService,
  listRolesService,
  updateRolePermissionsService,
} from "@/features/roles/services/role-service";
import {
  getRolePermissionEditorDataSchema,
  listPermissionsSchema,
  listRolesSchema,
  updateRolePermissionsSchema,
  type GetRolePermissionEditorDataInput,
  type ListPermissionsInput,
  type ListRolesInput,
  type UpdateRolePermissionsInput,
} from "@/features/roles/schemas/role-schema";

export async function listRolesAction(
  input: ListRolesInput = {},
): Promise<ActionResponse<RoleListItem[]>> {
  try {
    listRolesSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "role.read");

    const roles = await listRolesService();

    return successResponse("Roles berhasil dimuat.", roles);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function listPermissionsAction(
  input: ListPermissionsInput = {},
): Promise<ActionResponse<PermissionListItem[]>> {
  try {
    listPermissionsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "permission.read");

    const permissions = await listPermissionsService();

    return successResponse("Permissions berhasil dimuat.", permissions);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getRolePermissionEditorDataAction(
  input: GetRolePermissionEditorDataInput = {},
): Promise<ActionResponse<RolePermissionEditorData>> {
  try {
    getRolePermissionEditorDataSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "role.read");
    requirePermission(auth.user, "permission.read");

    const data = await getRolePermissionEditorDataService();

    return successResponse(
      "Role permission editor data berhasil dimuat.",
      data,
    );
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateRolePermissionsAction(
  input: UpdateRolePermissionsInput,
): Promise<ActionResponse<RoleListItem>> {
  try {
    const payload = updateRolePermissionsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "role.manage_permission");

    const role = await updateRolePermissionsService({
      actor: auth.user,
      roleSlug: payload.roleSlug,
      permissionSlugs: payload.permissionSlugs,
    });

    revalidatePath("/settings/roles");
    revalidatePath("/settings/users");

    return successResponse("Permission role berhasil diperbarui.", role);
  } catch (error) {
    return handleActionError(error);
  }
}
