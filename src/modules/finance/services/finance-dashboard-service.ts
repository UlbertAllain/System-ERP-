import "server-only";

import { addMoney, subtractMoney } from "@/lib/domain/money";

import {
  listExpenses,
  listExpensesByExpenseDateRange,
} from "@/features/finance/repositories/expense-repository";
import {
  listInvoices,
  listInvoicesByIssueDateRange,
} from "@/features/finance/repositories/invoice-repository";
import {
  listPayments,
  listPaymentsByPaymentDateRange,
} from "@/features/finance/repositories/payment-repository";
import type {
  FinanceDashboardDateFilter,
  FinanceDashboardSummary,
} from "@/types/finance-dashboard";

function parseDateOnly(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getEndOfDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function sortByDateDesc<T>(items: T[], getDate: (item: T) => Date | null): T[] {
  return [...items].sort((a, b) => {
    const aTime = getDate(a)?.getTime() ?? 0;
    const bTime = getDate(b)?.getTime() ?? 0;

    return bTime - aTime;
  });
}

export async function getFinanceDashboardSummaryService(
  filter: FinanceDashboardDateFilter = {},
): Promise<FinanceDashboardSummary> {
  const from = parseDateOnly(filter.from);
  const to = getEndOfDate(filter.to);

  const hasDateFilter = Boolean(from || to);

  const [filteredInvoices, filteredPayments, filteredExpenses] =
    await Promise.all([
      hasDateFilter
        ? listInvoicesByIssueDateRange({ from, to })
        : listInvoices({}),
      hasDateFilter
        ? listPaymentsByPaymentDateRange({ from, to })
        : listPayments({}),
      hasDateFilter
        ? listExpensesByExpenseDateRange({ from, to })
        : listExpenses({}),
    ]);

  const activeInvoices = filteredInvoices.filter(
    (invoice) => invoice.status !== "VOID",
  );

  const totalInvoiceAmount = activeInvoices.reduce(
    (total, invoice) => addMoney(total, invoice.totalAmount),
    0,
  );

  const totalPaidAmount = activeInvoices.reduce(
    (total, invoice) => addMoney(total, invoice.paidAmount),
    0,
  );

  const totalOutstandingAmount = activeInvoices.reduce(
    (total, invoice) => addMoney(total, invoice.remainingAmount),
    0,
  );

  const confirmedPayments = filteredPayments.filter(
    (payment) => payment.status === "CONFIRMED",
  );

  const totalPaymentAmount = confirmedPayments.reduce(
    (total, payment) => addMoney(total, payment.amount),
    0,
  );

  const validExpenses = filteredExpenses.filter(
    (expense) => expense.status !== "REJECTED",
  );

  const totalExpenseAmount = validExpenses.reduce(
    (total, expense) => addMoney(total, expense.amount),
    0,
  );

  const totalPaidExpenseAmount = filteredExpenses
    .filter((expense) => expense.status === "PAID")
    .reduce((total, expense) => addMoney(total, expense.amount), 0);

  const totalApprovedExpenseAmount = filteredExpenses
    .filter((expense) => expense.status === "APPROVED")
    .reduce((total, expense) => addMoney(total, expense.amount), 0);

  return {
    filter: {
      from,
      to,
    },

    totalInvoiceAmount,
    totalPaidAmount,
    totalOutstandingAmount,

    totalPaymentAmount,

    totalExpenseAmount,
    totalPaidExpenseAmount,
    totalApprovedExpenseAmount,

    estimatedGrossProfit: subtractMoney(totalInvoiceAmount, totalExpenseAmount),
    estimatedCashProfit: subtractMoney(totalPaymentAmount, totalPaidExpenseAmount),

    draftInvoices: filteredInvoices.filter(
      (invoice) => invoice.status === "DRAFT",
    ).length,
    issuedInvoices: filteredInvoices.filter(
      (invoice) => invoice.status === "ISSUED",
    ).length,
    partiallyPaidInvoices: filteredInvoices.filter(
      (invoice) => invoice.status === "PARTIALLY_PAID",
    ).length,
    paidInvoices: filteredInvoices.filter(
      (invoice) => invoice.status === "PAID",
    ).length,
    voidInvoices: filteredInvoices.filter(
      (invoice) => invoice.status === "VOID",
    ).length,

    draftExpenses: filteredExpenses.filter(
      (expense) => expense.status === "DRAFT",
    ).length,
    submittedExpenses: filteredExpenses.filter(
      (expense) => expense.status === "SUBMITTED",
    ).length,
    approvedExpenses: filteredExpenses.filter(
      (expense) => expense.status === "APPROVED",
    ).length,
    paidExpenses: filteredExpenses.filter(
      (expense) => expense.status === "PAID",
    ).length,
    rejectedExpenses: filteredExpenses.filter(
      (expense) => expense.status === "REJECTED",
    ).length,

    recentInvoices: sortByDateDesc(
      filteredInvoices,
      (invoice) => invoice.issueDate,
    ).slice(0, 5),

    recentPayments: sortByDateDesc(
      filteredPayments,
      (payment) => payment.paymentDate,
    ).slice(0, 5),

    recentExpenses: sortByDateDesc(
      filteredExpenses,
      (expense) => expense.expenseDate,
    ).slice(0, 5),
  };
}
