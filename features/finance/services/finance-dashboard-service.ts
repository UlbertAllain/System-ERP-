import "server-only";

import { listExpensesService } from "@/features/finance/services/expense-service";
import { listInvoicesService } from "@/features/finance/services/invoice-service";
import { listPaymentsService } from "@/features/finance/services/payment-service";
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

function isDateInsideRange(
  value: Date | null,
  from: Date | null,
  to: Date | null,
) {
  if (!value) {
    return false;
  }

  const time = value.getTime();

  if (from && time < from.getTime()) {
    return false;
  }

  if (to && time > to.getTime()) {
    return false;
  }

  return true;
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

  const [invoices, payments, expenses] = await Promise.all([
    listInvoicesService({}),
    listPaymentsService({}),
    listExpensesService({}),
  ]);

  const filteredInvoices =
    from || to
      ? invoices.filter((invoice) =>
          isDateInsideRange(invoice.issueDate, from, to),
        )
      : invoices;

  const filteredPayments =
    from || to
      ? payments.filter((payment) =>
          isDateInsideRange(payment.paymentDate, from, to),
        )
      : payments;

  const filteredExpenses =
    from || to
      ? expenses.filter((expense) =>
          isDateInsideRange(expense.expenseDate, from, to),
        )
      : expenses;

  const activeInvoices = filteredInvoices.filter(
    (invoice) => invoice.status !== "VOID",
  );

  const totalInvoiceAmount = activeInvoices.reduce(
    (total, invoice) => total + invoice.totalAmount,
    0,
  );

  const totalPaidAmount = activeInvoices.reduce(
    (total, invoice) => total + invoice.paidAmount,
    0,
  );

  const totalOutstandingAmount = activeInvoices.reduce(
    (total, invoice) => total + invoice.remainingAmount,
    0,
  );

  const confirmedPayments = filteredPayments.filter(
    (payment) => payment.status === "CONFIRMED",
  );

  const totalPaymentAmount = confirmedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );

  const validExpenses = filteredExpenses.filter(
    (expense) => expense.status !== "REJECTED",
  );

  const totalExpenseAmount = validExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );

  const totalPaidExpenseAmount = filteredExpenses
    .filter((expense) => expense.status === "PAID")
    .reduce((total, expense) => total + expense.amount, 0);

  const totalApprovedExpenseAmount = filteredExpenses
    .filter((expense) => expense.status === "APPROVED")
    .reduce((total, expense) => total + expense.amount, 0);

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

    estimatedGrossProfit: totalInvoiceAmount - totalExpenseAmount,
    estimatedCashProfit: totalPaymentAmount - totalPaidExpenseAmount,

    draftInvoices: filteredInvoices.filter(
      (invoice) => invoice.status === "DRAFT",
    ).length,
    issuedInvoices: filteredInvoices.filter(
      (invoice) => invoice.status === "ISSUED",
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
