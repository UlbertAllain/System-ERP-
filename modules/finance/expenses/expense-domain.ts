import { createHash } from "crypto";

import { AppError } from "@/lib/errors/app-error";
import { normalizeMoney } from "@/lib/domain/money";

export function normalizeExpenseNumber(expenseNumber: string): string {
  return expenseNumber.trim().toUpperCase();
}

export function getExpenseNumberLockId(expenseNumber: string): string {
  return createHash("sha256")
    .update(normalizeExpenseNumber(expenseNumber))
    .digest("hex");
}

export function normalizeExpenseAmount(amount: number): number {
  const normalizedAmount = normalizeMoney(amount);

  if (normalizedAmount <= 0) {
    throw new AppError(
      "Nominal pengeluaran harus lebih dari 0.",
      400,
      "INVALID_EXPENSE_AMOUNT",
    );
  }

  return normalizedAmount;
}
