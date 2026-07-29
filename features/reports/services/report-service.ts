import "server-only";

import { addMoney, subtractMoney } from "@/lib/domain/money";

import { listClientsService } from "@/features/clients/services/client-service";
import { listEmployeesService } from "@/features/employees/services/employee-service";
import { listExpensesService } from "@/features/finance/services/expense-service";
import { listInvoicesService } from "@/features/finance/services/invoice-service";
import { listProjectsService } from "@/features/projects/services/project-service";
import { listTasksService } from "@/features/projects/services/task-service";
import type {
  ReportsDashboardDateFilter,
  ReportsDashboardSummary,
} from "@/types/report";

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

function getProjectFilterDate(project: {
  startDate?: Date | null;
  createdAt?: Date | null;
}) {
  return project.startDate ?? project.createdAt ?? null;
}

function getTaskFilterDate(task: {
  dueDate?: Date | null;
  createdAt?: Date | null;
}) {
  return task.dueDate ?? task.createdAt ?? null;
}

export async function getReportsDashboardSummaryService(
  filter: ReportsDashboardDateFilter = {},
): Promise<ReportsDashboardSummary> {
  const from = parseDateOnly(filter.from);
  const to = getEndOfDate(filter.to);
  const hasDateFilter = Boolean(from || to);

  const [invoices, expenses, projects, tasks, clients, employees] =
    await Promise.all([
      listInvoicesService({}),
      listExpensesService({}),
      listProjectsService(),
      listTasksService({}),
      listClientsService(),
      listEmployeesService(),
    ]);

  const filteredInvoices = hasDateFilter
    ? invoices.filter((invoice) =>
        isDateInsideRange(invoice.issueDate, from, to),
      )
    : invoices;

  const filteredExpenses = hasDateFilter
    ? expenses.filter((expense) =>
        isDateInsideRange(expense.expenseDate, from, to),
      )
    : expenses;

  const filteredProjects = hasDateFilter
    ? projects.filter((project) =>
        isDateInsideRange(getProjectFilterDate(project), from, to),
      )
    : projects;

  const filteredTasks = hasDateFilter
    ? tasks.filter((task) =>
        isDateInsideRange(getTaskFilterDate(task), from, to),
      )
    : tasks;

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

  return {
    filter: {
      from,
      to,
    },

    finance: {
      totalInvoiceAmount,
      totalPaidAmount,
      totalOutstandingAmount,
      totalExpenseAmount,
      estimatedGrossProfit: subtractMoney(totalInvoiceAmount, totalExpenseAmount),
      estimatedCashProfit: subtractMoney(totalPaidAmount, totalPaidExpenseAmount),
    },

    projects: {
      totalProjects: filteredProjects.length,
      planningProjects: filteredProjects.filter(
        (project) => project.status === "PLANNING",
      ).length,
      inProgressProjects: filteredProjects.filter(
        (project) => project.status === "IN_PROGRESS",
      ).length,
      completedProjects: filteredProjects.filter(
        (project) => project.status === "COMPLETED",
      ).length,
      onHoldProjects: filteredProjects.filter(
        (project) => project.status === "ON_HOLD",
      ).length,
      cancelledProjects: filteredProjects.filter(
        (project) => project.status === "CANCELLED",
      ).length,
    },

    tasks: {
      totalTasks: filteredTasks.length,
      todoTasks: filteredTasks.filter((task) => task.status === "TODO").length,
      inProgressTasks: filteredTasks.filter(
        (task) => task.status === "IN_PROGRESS",
      ).length,
      inReviewTasks: filteredTasks.filter((task) => task.status === "IN_REVIEW")
        .length,
      doneTasks: filteredTasks.filter((task) => task.status === "DONE").length,
      blockedTasks: filteredTasks.filter((task) => task.status === "BLOCKED")
        .length,
      cancelledTasks: filteredTasks.filter(
        (task) => task.status === "CANCELLED",
      ).length,
    },

    clients: {
      totalClients: clients.length,
      activeClients: clients.filter((client) => client.status === "ACTIVE")
        .length,
      inactiveClients: clients.filter((client) => client.status === "INACTIVE")
        .length,
      archivedClients: clients.filter((client) => client.status === "ARCHIVED")
        .length,
    },

    hr: {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(
        (employee) => employee.status === "ACTIVE",
      ).length,
      inactiveEmployees: employees.filter(
        (employee) => employee.status === "INACTIVE",
      ).length,
      resignedEmployees: employees.filter(
        (employee) => employee.status === "RESIGNED",
      ).length,
    },

    recentInvoices: sortByDateDesc(
      filteredInvoices,
      (invoice) => invoice.issueDate,
    ).slice(0, 5),

    recentExpenses: sortByDateDesc(
      filteredExpenses,
      (expense) => expense.expenseDate,
    ).slice(0, 5),

    recentProjects: sortByDateDesc(filteredProjects, (project) =>
      getProjectFilterDate(project),
    ).slice(0, 5),

    recentTasks: sortByDateDesc(filteredTasks, (task) =>
      getTaskFilterDate(task),
    ).slice(0, 5),
  };
}
