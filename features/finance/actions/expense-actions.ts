"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { ExpenseDetail, ExpenseListItem } from "@/types/expense";
import {
  approveExpenseService,
  createExpenseService,
  deleteExpenseService,
  getExpenseByIdService,
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

export async function listExpensesAction(
  input: ListExpensesInput = {},
): Promise<ActionResponse<ExpenseListItem[]>> {
  try {
    const payload = listExpensesSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "expense.read");

    const expenses = await listExpensesService({
      projectId: payload.projectId,
      status: payload.status,
      category: payload.category,
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

    requirePermission(auth.user, "expense.read");

    const expense = await getExpenseByIdService(payload.id);

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

    requirePermission(auth.user, "expense.update");

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
