import type { InvoiceStatus } from "@/types/invoice";
import { compareMoney, normalizeMoney, subtractMoney } from "@/lib/domain/money";

export type InvoicePaymentProjection = {
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
};

export function deriveInvoicePaymentStatus(
  totalAmount: number,
  paidAmount: number,
  previousStatus: InvoiceStatus,
): InvoiceStatus {
  if (previousStatus === "VOID") return "VOID";
  if (compareMoney(paidAmount, totalAmount) >= 0 && totalAmount > 0) return "PAID";
  if (compareMoney(paidAmount, 0) > 0) return "PARTIALLY_PAID";
  if (previousStatus === "DRAFT") return "DRAFT";
  if (previousStatus === "OVERDUE") return "OVERDUE";
  return "ISSUED";
}

export function buildInvoicePaymentProjection(
  totalAmount: number,
  paidAmount: number,
  previousStatus: InvoiceStatus,
): InvoicePaymentProjection {
  const safePaidAmount = normalizeMoney(Math.max(paidAmount, 0));
  const normalizedTotalAmount = normalizeMoney(totalAmount);

  if (compareMoney(safePaidAmount, normalizedTotalAmount) > 0) {
    throw new Error("Paid amount exceeds invoice total.");
  }

  return {
    paidAmount: safePaidAmount,
    remainingAmount: subtractMoney(normalizedTotalAmount, safePaidAmount),
    status: deriveInvoicePaymentStatus(
      normalizedTotalAmount,
      safePaidAmount,
      previousStatus,
    ),
  };
}
