"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Receipt,
  RotateCcw,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import type { ReportsDashboardSummary } from "@/types/report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportsDashboardClientProps = {
  summary: ReportsDashboardSummary;
  initialFrom?: string;
  initialTo?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ReportsDashboardClient({
  summary,
  initialFrom = "",
  initialTo = "",
}: ReportsDashboardClientProps) {
  const router = useRouter();

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const activeFilterLabel = useMemo(() => {
    if (!initialFrom && !initialTo) {
      return "Semua periode";
    }

    if (initialFrom && initialTo) {
      return `${initialFrom} sampai ${initialTo}`;
    }

    if (initialFrom) {
      return `Mulai ${initialFrom}`;
    }

    return `Sampai ${initialTo}`;
  }, [initialFrom, initialTo]);

  function applyFilter() {
    const params = new URLSearchParams();

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    const query = params.toString();

    router.push(query ? `/reports?${query}` : "/reports");
  }

  function resetFilter() {
    setFrom("");
    setTo("");
    router.push("/reports");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Reports
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Reports Dashboard
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ringkasan lintas modul untuk finance, project, task, client, dan HR.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="from">From Date</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="to">To Date</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={applyFilter} className="gap-2">
              <Search className="size-4" />
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetFilter}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>

          <p className="text-sm text-muted-foreground md:col-span-3">
            Periode aktif:{" "}
            <span className="font-medium">{activeFilterLabel}</span>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Invoice Total"
          value={formatCurrency(summary.finance.totalInvoiceAmount)}
          description="Total invoice non-void"
          icon={FileText}
        />

        <MetricCard
          title="Paid Revenue"
          value={formatCurrency(summary.finance.totalPaidAmount)}
          description="Revenue yang sudah masuk"
          icon={Wallet}
        />

        <MetricCard
          title="Outstanding"
          value={formatCurrency(summary.finance.totalOutstandingAmount)}
          description="Invoice belum lunas"
          icon={TrendingUp}
        />

        <MetricCard
          title="Expenses"
          value={formatCurrency(summary.finance.totalExpenseAmount)}
          description="Expense non-rejected"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Gross Profit"
          value={formatCurrency(summary.finance.estimatedGrossProfit)}
          description="Invoice total - expense total"
          icon={BarChart3}
        />

        <MetricCard
          title="Cash Profit"
          value={formatCurrency(summary.finance.estimatedCashProfit)}
          description="Paid revenue - paid expense"
          icon={CheckCircle2}
        />

        <MetricCard
          title="Projects"
          value={summary.projects.totalProjects}
          description="Total project pada periode"
          icon={Briefcase}
        />

        <MetricCard
          title="Employees"
          value={summary.hr.totalEmployees}
          description="Total employee terdaftar"
          icon={Users}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Planning</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.planningProjects}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">In Progress</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.inProgressProjects}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Completed</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.completedProjects}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">On Hold</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.onHoldProjects}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Cancelled</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.cancelledProjects}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Todo</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.todoTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">In Progress</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.inProgressTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Review</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.inReviewTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Done</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.doneTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Blocked</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.blockedTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Cancelled</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.cancelledTasks}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Client Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.clients.totalClients}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.clients.activeClients}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Inactive</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.clients.inactiveClients}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Archived</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.clients.archivedClients}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              HR Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.hr.totalEmployees}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.hr.activeEmployees}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Inactive</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.hr.inactiveEmployees}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Resigned</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.hr.resignedEmployees}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.clientName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.status}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  </TableRow>
                ))}

                {summary.recentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada invoice pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {formatDate(task.dueDate)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{task.projectCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.projectName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}

                {summary.recentTasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada task pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.projectCode}
                      </p>
                    </TableCell>
                    <TableCell>{project.clientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{project.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}

                {summary.recentProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada project pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <p className="font-medium">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.expenseNumber}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.status}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  </TableRow>
                ))}

                {summary.recentExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada expense pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
