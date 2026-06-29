import type { ExpenseListItem } from "@/types/expense";
import type { InvoiceListItem } from "@/types/invoice";
import type { ProjectListItem } from "@/types/project";
import type { TaskListItem } from "@/types/task";

export type ReportsDashboardDateFilter = {
  from?: string;
  to?: string;
};

export type ReportsDashboardAppliedFilter = {
  from: Date | null;
  to: Date | null;
};

export type ReportsDashboardSummary = {
  filter: ReportsDashboardAppliedFilter;

  finance: {
    totalInvoiceAmount: number;
    totalPaidAmount: number;
    totalOutstandingAmount: number;
    totalExpenseAmount: number;
    estimatedGrossProfit: number;
    estimatedCashProfit: number;
  };

  projects: {
    totalProjects: number;
    planningProjects: number;
    inProgressProjects: number;
    completedProjects: number;
    onHoldProjects: number;
    cancelledProjects: number;
  };

  tasks: {
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    inReviewTasks: number;
    doneTasks: number;
    blockedTasks: number;
    cancelledTasks: number;
  };

  clients: {
    totalClients: number;
    activeClients: number;
    inactiveClients: number;
    archivedClients: number;
  };

  hr: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    resignedEmployees: number;
  };

  recentInvoices: InvoiceListItem[];
  recentExpenses: ExpenseListItem[];
  recentProjects: ProjectListItem[];
  recentTasks: TaskListItem[];
};
