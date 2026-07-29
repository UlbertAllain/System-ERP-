"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { EmployeeDetail, EmployeeListItem } from "@/types/employee";
import {
  createEmployeeService,
  deleteEmployeeService,
  getEmployeeByIdService,
  listEmployeesService,
  restoreEmployeeService,
  updateEmployeeService,
  updateOwnEmployeeProfileService,
  updateEmployeePhotoService,
} from "@/features/employees/services/employee-service";
import {
  createEmployeeSchema,
  employeeIdSchema,
  listEmployeesSchema,
  updateEmployeeSchema,
  updateOwnEmployeeProfileSchema,
  updateEmployeePhotoSchema,
  type UpdateEmployeePhotoInput,
  type CreateEmployeeInput,
  type EmployeeIdInput,
  type ListEmployeesInput,
  type UpdateEmployeeInput,
  type UpdateOwnEmployeeProfileInput,
} from "@/features/employees/schemas/employee-schema";

export async function listEmployeesAction(
  input: ListEmployeesInput = {},
): Promise<ActionResponse<EmployeeListItem[]>> {
  try {
    listEmployeesSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "employee.read",
      "employee.read_all",
      "employee.read_own",
    ]);

    const employees = await listEmployeesService();

    if (
      auth.user.permissions.includes("employee.read_own") &&
      !auth.user.permissions.includes("employee.read_all") &&
      !auth.user.permissions.includes("employee.read")
    ) {
      return successResponse(
        "Employees berhasil dimuat.",
        employees.filter((employee) => employee.userId === auth.user.uid),
      );
    }

    return successResponse("Employees berhasil dimuat.", employees);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getEmployeeByIdAction(
  input: EmployeeIdInput,
): Promise<ActionResponse<EmployeeDetail>> {
  try {
    const payload = employeeIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "employee.read",
      "employee.read_all",
      "employee.read_own",
    ]);

    const employee = await getEmployeeByIdService(payload.id);

    if (
      auth.user.permissions.includes("employee.read_own") &&
      !auth.user.permissions.includes("employee.read_all") &&
      !auth.user.permissions.includes("employee.read") &&
      employee.userId !== auth.user.uid
    ) {
      return {
        success: false,
        message: "Akses ditolak untuk employee profile ini.",
      };
    }

    return successResponse("Employee berhasil dimuat.", employee);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createEmployeeAction(
  input: CreateEmployeeInput,
): Promise<ActionResponse<EmployeeDetail>> {
  try {
    const payload = createEmployeeSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "employee.create");

    const employee = await createEmployeeService({
      actor: auth.user,
      ...payload,
    });

    revalidatePath("/employees");
    revalidatePath("/settings/users");

    return successResponse("Employee berhasil dibuat.", employee);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateEmployeeAction(
  input: UpdateEmployeeInput,
): Promise<ActionResponse<EmployeeDetail>> {
  try {
    const payload = updateEmployeeSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "employee.update");

    const employee = await updateEmployeeService({
      actor: auth.user,
      ...payload,
    });

    revalidatePath("/employees");
    revalidatePath("/settings/users");

    return successResponse("Employee berhasil diperbarui.", employee);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateOwnEmployeeProfileAction(
  input: UpdateOwnEmployeeProfileInput,
): Promise<ActionResponse<EmployeeDetail>> {
  try {
    const payload = updateOwnEmployeeProfileSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "employee.update_own");

    const employee = await updateOwnEmployeeProfileService({
      actor: auth.user,
      ...payload,
    });

    revalidatePath("/employees");

    return successResponse("Profile employee berhasil diperbarui.", employee);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateEmployeePhotoAction(
  input: UpdateEmployeePhotoInput,
): Promise<ActionResponse<EmployeeDetail>> {
  try {
    const payload = updateEmployeePhotoSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "employee.photo.update");

    const employee = await updateEmployeePhotoService({
      actor: auth.user,
      id: payload.id,
      photo: payload.photo,
    });

    revalidatePath("/employees");

    return successResponse("Foto employee berhasil diperbarui.", employee);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteEmployeeAction(
  input: EmployeeIdInput,
): Promise<ActionResponse<EmployeeDetail>> {
  try {
    const payload = employeeIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "employee.delete");

    const employee = await deleteEmployeeService({
      actor: auth.user,
      id: payload.id,
    });

    revalidatePath("/employees");
    revalidatePath("/settings/users");

    return successResponse("Employee berhasil dihapus.", employee);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function restoreEmployeeAction(
  input: EmployeeIdInput,
): Promise<ActionResponse<EmployeeDetail>> {
  try {
    const payload = employeeIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "employee.restore");

    const employee = await restoreEmployeeService({
      actor: auth.user,
      id: payload.id,
    });

    revalidatePath("/employees");
    revalidatePath("/settings/users");

    return successResponse("Employee berhasil direstore.", employee);
  } catch (error) {
    return handleActionError(error);
  }
}
