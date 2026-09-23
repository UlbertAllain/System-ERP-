import { createHash, randomUUID } from "crypto";

import { AppError } from "@/lib/errors/app-error";
import {
  addMoney,
  compareMoney,
  normalizeMoney,
  subtractMoney,
} from "@/lib/domain/money";
import type { InvoiceLineItem } from "@/types/invoice";

export type RawInvoiceLineItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceTotals = {
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export function normalizeInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber.trim().toUpperCase();
}

export function assertValidInvoiceDateRange(
  issueDate: string,
  dueDate: string,
): void {
  const issue = new Date(issueDate);
  const due = new Date(dueDate);

  if (Number.isNaN(issue.getTime()) || Number.isNaN(due.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  if (due.getTime() < issue.getTime()) {
    throw new AppError(
      "Tanggal jatuh tempo tidak boleh sebelum tanggal terbit.",
      400,
      "INVALID_INVOICE_DATE_RANGE",
    );
  }
}

export function calculateInvoiceTotals({
  lineItems,
  discountAmount,
  taxAmount,
}: {
  lineItems: RawInvoiceLineItem[];
  discountAmount: number;
  taxAmount: number;
}): InvoiceTotals {
  const normalizedLineItems = lineItems.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new AppError(
        "Jumlah item invoice harus lebih dari 0.",
        400,
        "INVALID_INVOICE_QUANTITY",
      );
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new AppError(
        "Harga item invoice tidak valid.",
        400,
        "INVALID_INVOICE_UNIT_PRICE",
      );
    }

    return {
      id: item.id ?? `item_${randomUUID()}`,
      description: item.description.trim(),
      quantity,
      unitPrice: normalizeMoney(unitPrice),
      amount: normalizeMoney(quantity * unitPrice),
    };
  });

  const subtotal = addMoney(
    ...normalizedLineItems.map((item) => item.amount),
  );

  if (!Number.isFinite(discountAmount) || discountAmount < 0) {
    throw new AppError(
      "Nilai diskon tidak valid.",
      400,
      "INVALID_INVOICE_DISCOUNT",
    );
  }

  if (!Number.isFinite(taxAmount) || taxAmount < 0) {
    throw new AppError(
      "Nilai pajak tidak valid.",
      400,
      "INVALID_INVOICE_TAX",
    );
  }

  if (compareMoney(discountAmount, subtotal) > 0) {
    throw new AppError(
      "Diskon tidak boleh lebih besar dari subtotal.",
      400,
      "INVALID_INVOICE_DISCOUNT",
    );
  }

  const normalizedDiscountAmount = normalizeMoney(discountAmount);
  const normalizedTaxAmount = normalizeMoney(taxAmount);
  const totalAmount = addMoney(
    subtractMoney(subtotal, normalizedDiscountAmount),
    normalizedTaxAmount,
  );

  if (totalAmount <= 0) {
    throw new AppError(
      "Total invoice harus lebih besar dari 0.",
      400,
      "INVALID_INVOICE_TOTAL",
    );
  }

  return {
    lineItems: normalizedLineItems,
    subtotal,
    discountAmount: normalizedDiscountAmount,
    taxAmount: normalizedTaxAmount,
    totalAmount,
  };
}

export function getInvoiceNumberLockId(invoiceNumber: string): string {
  return createHash("sha256")
    .update(normalizeInvoiceNumber(invoiceNumber))
    .digest("hex");
}
