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
import type { ExpenseDetail, ExpenseListItem } from "@/types/expense";
import {
  approveExpenseService,
  createExpenseService,
  deleteExpenseService,
  getExpenseByIdService,
  listExpensesPaginatedService,
  listExpensesService,
  markExpensePaidService,
  rejectExpenseService,
  submitExpenseService,
  updateExpenseService,
} from "@/features/finance/services/expense-service";
import {
  createExpenseSchema,
  expenseIdSchema,
  listExpensesSchema,
  rejectExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type ExpenseIdInput,
  type ListExpensesInput,
  type RejectExpenseInput,
  type UpdateExpenseInput,
} from "@/features/finance/schemas/expense-schema";

function revalidateExpensePaths() {
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

function hasOnlyOwnExpenseRead(permissions: string[]): boolean {
  return (
    permissions.includes("expense.read_own") &&
    !permissions.includes("expense.read") &&
    !permissions.includes("expense.read_all")
  );
}

function expenseMatchesFilters(
  expense: ExpenseListItem,
  payload: ListExpensesInput,
): boolean {
  const normalizedSearch = payload.search?.trim().toLowerCase();

  if (payload.projectId && expense.projectId !== payload.projectId) return false;
  if (payload.status && expense.status !== payload.status) return false;
  if (payload.category && expense.category !== payload.category) return false;

  if (normalizedSearch) {
    return [
      expense.expenseNumber,
      expense.title,
      expense.category,
      expense.projectName,
      expense.projectCode,
      expense.vendorName,
      expense.createdByName,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  }

  return true;
}

function paginateExpenses(
  expenses: ExpenseListItem[],
  page: number,
  pageSize: number,
): PaginatedResult<ExpenseListItem> {
  const totalItems = expenses.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const offset = (page - 1) * pageSize;

  return {
    items: expenses.slice(offset, offset + pageSize),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}

export async function listExpensesAction(
  input: ListExpensesInput = {},
): Promise<ActionResponse<ExpenseListItem[]>> {
  try {
    const payload = listExpensesSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "expense.read",
      "expense.read_all",
      "expense.read_own",
    ]);

    const expenses = await listExpensesService({
      projectId: payload.projectId,
      status: payload.status,
      category: payload.category,
    });

    if (hasOnlyOwnExpenseRead(auth.user.permissions)) {
      return successResponse(
        "Expenses berhasil dimuat.",
        expenses.filter((expense) => expense.createdByUserId === auth.user.uid),
      );
    }

    return successResponse("Expenses berhasil dimuat.", expenses);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function listExpensesPaginatedAction(
  input: ListExpensesInput = {},
): Promise<ActionResponse<PaginatedResult<ExpenseListItem>>> {
  try {
    const payload = listExpensesSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "expense.read",
      "expense.read_all",
      "expense.read_own",
    ]);

    if (hasOnlyOwnExpenseRead(auth.user.permissions)) {
      const expenses = await listExpensesService({});
      const scopedExpenses = expenses
        .filter((expense) => expense.createdByUserId === auth.user.uid)
        .filter((expense) => expenseMatchesFilters(expense, payload));

      return successResponse(
        "Expenses berhasil dimuat.",
        paginateExpenses(scopedExpenses, payload.page, payload.pageSize),
      );
    }

    const expenses = await listExpensesPaginatedService({
      search: payload.search,
      projectId: payload.projectId,
      status: payload.status,
      category: payload.category,
      page: payload.page,
      pageSize: payload.pageSize,
    });

    return successResponse("Expenses berhasil dimuat.", expenses);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getExpenseByIdAction(
  input: ExpenseIdInput,
): Promise<ActionResponse<ExpenseDetail>> {
  try {
    const payload = expenseIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "expense.read",
      "expense.read_all",
      "expense.read_own",
    ]);

    const expense = await getExpenseByIdService(payload.id);

    if (
      auth.user.permissions.includes("expense.read_own") &&
      !auth.user.permissions.includes("expense.read") &&
      !auth.user.permissions.includes("expense.read_all") &&
      expense.createdByUserId !== auth.user.uid
    ) {
      return {
        success: false,
        message: "Akses ditolak untuk expense ini.",
      };
    }

    return successResponse("Expense berhasil dimuat.", expense);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createExpenseAction(
  input: CreateExpenseInput,
): Promise<ActionResponse<ExpenseDetail>> {
  try {
    const payload = createExpenseSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "expense.create");

    const expense = await createExpenseService({
      actor: auth.user,
      ...payload,
    });

    revalidateExpensePaths();

    return successResponse("Expense berhasil dibuat.", expense);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateExpenseAction(
  input: UpdateExpenseInput,
): Promise<ActionResponse<ExpenseDetail>> {
  try {
    const payload = updateExpenseSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, ["expense.update", "expense.update_own"]);

    if (
      auth.user.permissions.includes("expense.update_own") &&
      !auth.user.permissions.includes("expense.update")
    ) {
      const expense = await getExpenseByIdService(payload.id);

      if (expense.createdByUserId !== auth.user.uid) {
        return {
          success: false,
          message: "Akses ditolak untuk update expense ini.",
        };
      }
    }

    const expense = await updateExpenseService({
      actor: auth.user,
      ...payload,
    });

    revalidateExpensePaths();

    return successResponse("Expense berhasil diperbarui.", expense);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function submitExpenseAction(
  input: ExpenseIdInput,
): Promise<ActionResponse<ExpenseDetail>> {
  try {
    const payload = expenseIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "expense.submit");

    const expense = await submitExpenseService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateExpensePaths();

    return successResponse("Expense berhasil disubmit.", expense);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function approveExpenseAction(
  input: ExpenseIdInput,
): Promise<ActionResponse<ExpenseDetail>> {
  try {
    const payload = expenseIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "expense.approve");

    const expense = await approveExpenseService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateExpensePaths();

    return successResponse("Expense berhasil di-approve.", expense);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function rejectExpenseAction(
  input: RejectExpenseInput,
): Promise<ActionResponse<ExpenseDetail>> {
  try {
    const payload = rejectExpenseSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "expense.reject");

    const expense = await rejectExpenseService({
      actor: auth.user,
      id: payload.id,
      reason: payload.reason,
    });

    revalidateExpensePaths();

    return successResponse("Expense berhasil di-reject.", expense);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function markExpensePaidAction(
  input: ExpenseIdInput,
): Promise<ActionResponse<ExpenseDetail>> {
  try {
    const payload = expenseIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "expense.mark_as_paid");

    const expense = await markExpensePaidService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateExpensePaths();

    return successResponse("Expense berhasil ditandai paid.", expense);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteExpenseAction(
  input: ExpenseIdInput,
): Promise<ActionResponse<ExpenseDetail>> {
  try {
    const payload = expenseIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "expense.delete");

    const expense = await deleteExpenseService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateExpensePaths();

    return successResponse("Expense berhasil dihapus.", expense);
  } catch (error) {
    return handleActionError(error);
  }
}
