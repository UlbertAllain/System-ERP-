import type { ExpenseListItem } from "@/types/expense";
import type { InvoiceListItem } from "@/types/invoice";
import type { PaymentListItem } from "@/types/payment";

export type FinanceDashboardDateFilter = {
  from?: string;
  to?: string;
};

export type FinanceDashboardAppliedFilter = {
  from: Date | null;
  to: Date | null;
};

export type FinanceDashboardSummary = {
  filter: FinanceDashboardAppliedFilter;

  totalInvoiceAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;

  totalPaymentAmount: number;

  totalExpenseAmount: number;
  totalPaidExpenseAmount: number;
  totalApprovedExpenseAmount: number;

  estimatedGrossProfit: number;
  estimatedCashProfit: number;

  draftInvoices: number;
  issuedInvoices: number;
  paidInvoices: number;
  voidInvoices: number;

  draftExpenses: number;
  submittedExpenses: number;
  approvedExpenses: number;
  paidExpenses: number;
  rejectedExpenses: number;

  recentInvoices: InvoiceListItem[];
  recentPayments: PaymentListItem[];
  recentExpenses: ExpenseListItem[];
};
