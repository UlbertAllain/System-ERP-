"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { PaginatedResult } from "@/types/common";
import type { UserDetail, UserListItem } from "@/types/user";
import {
  activateUserService,
  createInternalUserService,
  getUserByIdService,
  listUsersPaginatedService,
  listUsersService,
  softDeleteUserService,
  suspendUserService,
  updateUserProfileService,
  updateUserRolesService,
} from "@/modules/users/services/user-service";
import {
  createUserSchema,
  getUserByIdSchema,
  listUsersSchema,
  updateUserProfileSchema,
  updateUserRolesSchema,
  updateUserStatusSchema,
  type CreateUserInput,
  type GetUserByIdInput,
  type ListUsersInput,
  type UpdateUserProfileInput,
  type UpdateUserRolesInput,
  type UpdateUserStatusInput,
} from "@/modules/users/schemas/user-schema";

export async function listUsersAction(
  input: ListUsersInput = {},
): Promise<ActionResponse<UserListItem[]>> {
  try {
    listUsersSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "user.read");

    const users = await listUsersService();

    return successResponse("Users berhasil dimuat.", users);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function listUsersPaginatedAction(
  input: ListUsersInput = {},
): Promise<ActionResponse<PaginatedResult<UserListItem>>> {
  try {
    const payload = listUsersSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "user.read");

    const users = await listUsersPaginatedService({
      search: payload.search,
      status: payload.status,
      roleSlug: payload.roleSlug,
      page: payload.page,
      pageSize: payload.pageSize,
    });

    return successResponse("Users berhasil dimuat.", users);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getUserByIdAction(
  input: GetUserByIdInput,
): Promise<ActionResponse<UserDetail>> {
  try {
    const payload = getUserByIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "user.read");

    const user = await getUserByIdService(payload.uid);

    return successResponse("User berhasil dimuat.", user);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createUserAction(
  input: CreateUserInput,
): Promise<ActionResponse<UserDetail>> {
  try {
    const payload = createUserSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "user.create");

    const user = await createInternalUserService({
      actor: auth.user,
      name: payload.name,
      email: payload.email,
      password: payload.password,
      roleSlugs: payload.roleSlugs,
      mustChangePassword: payload.mustChangePassword,
    });

    revalidatePath("/settings/users");

    return successResponse("User berhasil dibuat.", user);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateUserProfileAction(
  input: UpdateUserProfileInput,
): Promise<ActionResponse<UserDetail>> {
  try {
    const payload = updateUserProfileSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "user.update");

    const user = await updateUserProfileService({
      actor: auth.user,
      uid: payload.uid,
      name: payload.name,
      email: payload.email,
    });

    revalidatePath("/settings/users");

    return successResponse("User berhasil diperbarui.", user);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function suspendUserAction(
  input: UpdateUserStatusInput,
): Promise<ActionResponse<UserDetail>> {
  try {
    const payload = updateUserStatusSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "user.suspend");

    const user = await suspendUserService({
      actor: auth.user,
      uid: payload.uid,
    });

    revalidatePath("/settings/users");

    return successResponse("User berhasil disuspend.", user);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function activateUserAction(
  input: UpdateUserStatusInput,
): Promise<ActionResponse<UserDetail>> {
  try {
    const payload = updateUserStatusSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "user.activate");

    const user = await activateUserService({
      actor: auth.user,
      uid: payload.uid,
    });

    revalidatePath("/settings/users");

    return successResponse("User berhasil diaktifkan.", user);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateUserRolesAction(
  input: UpdateUserRolesInput,
): Promise<ActionResponse<UserDetail>> {
  try {
    const payload = updateUserRolesSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "user.assign_role");

    const user = await updateUserRolesService({
      actor: auth.user,
      uid: payload.uid,
      roleSlugs: payload.roleSlugs,
    });

    revalidatePath("/settings/users");

    return successResponse("Role user berhasil diperbarui.", user);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteUserAction(
  input: UpdateUserStatusInput,
): Promise<ActionResponse<UserDetail>> {
  try {
    const payload = updateUserStatusSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "user.delete");

    const user = await softDeleteUserService({
      actor: auth.user,
      uid: payload.uid,
    });

    revalidatePath("/settings/users");

    return successResponse("User berhasil dihapus.", user);
  } catch (error) {
    return handleActionError(error);
  }
}
