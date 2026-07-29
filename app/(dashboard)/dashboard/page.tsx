import type { ComponentType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Receipt,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PermissionSlug } from "@/constants/permissions";
import { listExpensesService } from "@/features/finance/services/expense-service";
import { listInvoicesService } from "@/features/finance/services/invoice-service";
import { getHrDashboardSummaryService } from "@/features/hr/services/hr-dashboard-service";
import {
  filterProjectsForUser,
  filterTasksForUser,
  getAssignedProjectIdsForUser,
} from "@/features/projects/actions/project-access-scope";
import { listProjectsService } from "@/features/projects/services/project-service";
import { listTasksService } from "@/features/projects/services/task-service";
import { getCurrentUserFromSession } from "@/lib/auth/session";
import { addMoney } from "@/lib/domain/money";
import { getBusinessLabel } from "@/lib/ui/business-labels";
import type { CurrentUser } from "@/types/auth";
import type { TaskListItem } from "@/types/task";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

const actionLinks = [
  {
    label: "Buat tagihan",
    description: "Siapkan tagihan baru untuk pelanggan.",
    href: "/invoices",
    permissions: ["invoice.create"],
  },
  {
    label: "Catat pembayaran",
    description: "Masukkan pembayaran untuk tagihan yang telah diterbitkan.",
    href: "/payments",
    permissions: ["payment.create"],
  },
  {
    label: "Ajukan pengeluaran",
    description: "Catat biaya operasional untuk diproses dan disetujui.",
    href: "/expenses",
    permissions: ["expense.create"],
  },
  {
    label: "Kelola proyek",
    description: "Periksa progres, tugas, anggota, dan tahapan proyek.",
    href: "/projects",
    permissions: ["project.read", "project.read_all", "project.read_assigned"],
  },
] satisfies Array<{
  label: string;
  description: string;
  href: string;
  permissions: PermissionSlug[];
}>;

function hasAnyPermission(user: CurrentUser, permissions: PermissionSlug[]) {
  return permissions.some((permission) => user.permissions.includes(permission));
}

function formatDate(value: Date | null) {
  if (!value) return "Tanpa tenggat";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatToday() {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function isOverdue(task: TaskListItem) {
  if (!task.dueDate || task.status === "DONE" || task.status === "CANCELLED") {
    return false;
  }

  return task.dueDate.getTime() < Date.now();
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <Card className="h-full transition-transform duration-200 hover:-translate-y-0.5">
      <CardContent className="flex h-full items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-3 truncate text-[1.65rem] font-semibold leading-none tracking-[-0.035em] text-foreground">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-gold/20 bg-gold/10 text-gold">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function ProgressRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {numberFormatter.format(value)} · {percentage}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const sessionUser = await getCurrentUserFromSession();

  if (!sessionUser) {
    redirect("/login");
    throw new Error("UNREACHABLE");
  }
  const user = sessionUser;

  const canReadProjects = hasAnyPermission(user, [
    "project.read",
    "project.read_all",
    "project.read_assigned",
  ]);
  const canReadTasks = hasAnyPermission(user, [
    "task.read",
    "task.read_all",
    "task.read_assigned",
  ]);
  const canReadFinanceSummary = user.permissions.includes(
    "finance.dashboard.read",
  );
  const canReadInvoices =
    canReadFinanceSummary ||
    hasAnyPermission(user, [
      "invoice.read",
      "invoice.read_all",
      "invoice.read_project",
    ]);
  const canReadExpenses =
    canReadFinanceSummary ||
    hasAnyPermission(user, [
      "expense.read",
      "expense.read_all",
      "expense.read_own",
    ]);
  const canReadFinance = canReadInvoices || canReadExpenses;
  const hasOnlyProjectInvoiceRead =
    !canReadFinanceSummary &&
    user.permissions.includes("invoice.read_project") &&
    !user.permissions.includes("invoice.read") &&
    !user.permissions.includes("invoice.read_all");
  const hasOnlyOwnExpenseRead =
    !canReadFinanceSummary &&
    user.permissions.includes("expense.read_own") &&
    !user.permissions.includes("expense.read") &&
    !user.permissions.includes("expense.read_all");
  const canReadHr = hasAnyPermission(user, [
    "hr.dashboard.read",
    "leave.read",
    "leave.read_all",
    "attendance.read",
    "attendance.read_all",
  ]);

  const [
    rawProjects,
    rawTasks,
    invoices,
    expenses,
    hrSummary,
    assignedInvoiceProjectIds,
  ] = await Promise.all([
    canReadProjects ? listProjectsService() : Promise.resolve([]),
    canReadTasks ? listTasksService({}) : Promise.resolve([]),
    canReadInvoices ? listInvoicesService({}) : Promise.resolve([]),
    canReadExpenses ? listExpensesService({}) : Promise.resolve([]),
    canReadHr ? getHrDashboardSummaryService() : Promise.resolve(null),
    hasOnlyProjectInvoiceRead
      ? getAssignedProjectIdsForUser(user)
      : Promise.resolve<Set<string> | null>(null),
  ]);

  const [projects, tasks] = await Promise.all([
    canReadProjects ? filterProjectsForUser(user, rawProjects) : [],
    canReadTasks ? filterTasksForUser(user, rawTasks) : [],
  ]);

  const scopedInvoices = hasOnlyProjectInvoiceRead
    ? invoices.filter(
        (invoice) =>
          invoice.projectId !== null &&
          assignedInvoiceProjectIds?.has(invoice.projectId),
      )
    : invoices;
  const scopedExpenses = hasOnlyOwnExpenseRead
    ? expenses.filter((expense) => expense.createdByUserId === user.uid)
    : expenses;

  const activeProjects = projects.filter((project) =>
    ["PLANNING", "IN_PROGRESS", "ON_HOLD"].includes(project.status),
  );
  const completedProjects = projects.filter(
    (project) => project.status === "COMPLETED",
  );
  const onHoldProjects = projects.filter((project) => project.status === "ON_HOLD");
  const openTasks = tasks.filter(
    (task) => task.status !== "DONE" && task.status !== "CANCELLED",
  );
  const completedTasks = tasks.filter((task) => task.status === "DONE");
  const inProgressTasks = tasks.filter((task) => task.status === "IN_PROGRESS");
  const blockedTasks = openTasks.filter((task) => task.status === "BLOCKED");
  const overdueTasks = openTasks.filter(isOverdue);
  const upcomingTasks = [...openTasks]
    .sort(
      (a, b) =>
        (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 6);

  const outstandingInvoices = scopedInvoices.filter(
    (invoice) =>
      invoice.status !== "DRAFT" &&
      invoice.status !== "VOID" &&
      invoice.remainingAmount > 0,
  );
  const outstandingAmount = outstandingInvoices.reduce(
    (total, invoice) => addMoney(total, invoice.remainingAmount),
    0,
  );
  const pendingExpenses = scopedExpenses.filter((expense) =>
    ["SUBMITTED", "APPROVED"].includes(expense.status),
  );
  const pendingExpenseAmount = pendingExpenses.reduce(
    (total, expense) => addMoney(total, expense.amount),
    0,
  );
  const visibleActions = actionLinks.filter((action) =>
    hasAnyPermission(user, action.permissions),
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Ringkasan operasional
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Selamat datang, {user.name || user.email.split("@")[0]}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Fokuskan pekerjaan pada data yang membutuhkan tindakan. Seluruh angka mengikuti akses akun Anda.
          </p>
        </div>
        <div className="rounded-md border bg-card px-4 py-2.5 text-right">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            Hari ini
          </p>
          <p className="mt-1 text-sm font-medium capitalize">{formatToday()}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {canReadTasks ? (
          <SummaryCard
            title="Tugas terbuka"
            value={numberFormatter.format(openTasks.length)}
            description={`${blockedTasks.length} terhambat · ${overdueTasks.length} melewati tenggat`}
            icon={CheckCircle2}
            href="/projects/tasks"
          />
        ) : null}
        {canReadProjects ? (
          <SummaryCard
            title="Proyek aktif"
            value={numberFormatter.format(activeProjects.length)}
            description={`${completedProjects.length} selesai · ${onHoldProjects.length} ditunda`}
            icon={BriefcaseBusiness}
            href="/projects"
          />
        ) : null}
        {canReadFinance ? (
          <SummaryCard
            title="Sisa tagihan"
            value={compactCurrencyFormatter.format(outstandingAmount)}
            description={`${outstandingInvoices.length} tagihan belum lunas`}
            icon={CircleDollarSign}
            href="/invoices"
          />
        ) : null}
        {canReadFinance ? (
          <SummaryCard
            title="Pengeluaran diproses"
            value={compactCurrencyFormatter.format(pendingExpenseAmount)}
            description={`${pendingExpenses.length} pengajuan menunggu proses`}
            icon={Receipt}
            href="/expenses"
          />
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle>Pekerjaan yang perlu ditindaklanjuti</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tugas terbuka diurutkan berdasarkan tenggat terdekat.
                </p>
              </div>
              {canReadTasks ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/projects/tasks">
                    Buka daftar tugas
                    <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingTasks.length > 0 ? (
              <div className="divide-y">
                {upcomingTasks.map((task) => {
                  const attention = task.status === "BLOCKED" || isOverdue(task);

                  return (
                    <div
                      key={task.id}
                      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-secondary/40 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border ${
                            attention
                              ? "border-destructive/20 bg-destructive/10 text-destructive"
                              : "border-gold/20 bg-gold/10 text-gold"
                          }`}
                        >
                          {attention ? (
                            <AlertTriangle className="size-4" />
                          ) : (
                            <CalendarClock className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{task.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {task.projectCode} · {task.projectName}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-3 md:justify-end">
                        <Badge variant="outline">{getBusinessLabel(task.status)}</Badge>
                        <span className="w-28 text-right text-xs text-muted-foreground">
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center">
                <CheckCircle2 className="size-7 text-gold" />
                <p className="mt-3 text-sm font-semibold">Tidak ada tugas mendesak</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  Semua tugas yang dapat Anda akses sudah selesai atau belum memiliki tindakan lanjutan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Distribusi pekerjaan</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Gambaran status berdasarkan data yang dapat Anda akses.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {canReadTasks ? (
              <>
                <ProgressRow label="Tugas selesai" value={completedTasks.length} total={tasks.length} />
                <ProgressRow label="Tugas berjalan" value={inProgressTasks.length} total={tasks.length} />
                <ProgressRow label="Tugas terhambat" value={blockedTasks.length} total={tasks.length} />
              </>
            ) : null}
            {canReadProjects ? (
              <ProgressRow label="Proyek aktif" value={activeProjects.length} total={projects.length} />
            ) : null}
            {!canReadTasks && !canReadProjects ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Akun ini tidak memiliki akses ke data proyek atau tugas.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Tindakan cepat</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Mulai pekerjaan umum tanpa mencari menu terlebih dahulu.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
            {visibleActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-start justify-between gap-4 rounded-md border bg-card p-4 transition-all hover:border-gold/35 hover:bg-secondary/40"
              >
                <div>
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" />
              </Link>
            ))}
            {visibleActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada tindakan cepat yang tersedia untuk peran akun ini.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {canReadHr && hrSummary ? (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-gold" />
                Kehadiran tim hari ini
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5 text-sm">
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Sudah masuk</span>
                <strong>{numberFormatter.format(hrSummary.todayClockedIn)}</strong>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Belum masuk</span>
                <strong>{numberFormatter.format(hrSummary.todayNotClockedIn)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Cuti menunggu</span>
                <strong>{numberFormatter.format(hrSummary.pendingLeaveRequests)}</strong>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-1 w-full">
                <Link href="/hr">Buka ringkasan SDM</Link>
              </Button>
            </CardContent>
          </Card>
        ) : canReadFinance ? (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Ringkasan piutang</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                Belum diterima
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {currencyFormatter.format(outstandingAmount)}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Terdiri dari {outstandingInvoices.length} tagihan yang masih memiliki sisa pembayaran.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-5 w-full">
                <Link href="/finance">Buka ringkasan keuangan</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
