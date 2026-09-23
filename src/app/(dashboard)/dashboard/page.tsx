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
import { listExpensesService } from "@/modules/finance/services/expense-service";
import { listInvoicesService } from "@/modules/finance/services/invoice-service";
import { getHrDashboardSummaryService } from "@/modules/hr/services/hr-dashboard-service";
import {
  filterProjectsForUser,
  filterTasksForUser,
  getAssignedProjectIdsForUser,
} from "@/modules/projects/actions/project-access-scope";
import { listProjectsService } from "@/modules/projects/services/project-service";
import { listTasksService } from "@/modules/projects/services/task-service";
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
    <Card className="h-full bg-card/95 transition-colors hover:border-primary/35">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {title}
          </p>
          <span className="flex size-7 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
            <Icon className="size-3.5" />
          </span>
        </div>
        <div className="px-4 py-4">
          <p className="truncate text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-foreground">
            {value}
          </p>
          <div className="mt-3 flex items-start gap-2 text-[0.7rem] leading-4 text-muted-foreground">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{description}</span>
          </div>
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
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[0.7rem]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">
          {numberFormatter.format(value)} / {numberFormatter.format(total)}
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
    <div className="space-y-4">
      <section className="flex flex-col justify-between gap-3 rounded-md border bg-card/92 px-4 py-3.5 md:flex-row md:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[0.64rem] font-bold uppercase tracking-[0.13em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Command center
          </div>
          <h2 className="mt-2 truncate text-xl font-semibold tracking-tight md:text-2xl">
            Ringkasan operasional
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Selamat datang, {user.name || user.email.split("@")[0]}. Data ditampilkan sesuai hak akses akun.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-md border bg-secondary/35 px-3 py-2 text-right">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.11em] text-muted-foreground">
              Hari ini
            </p>
            <p className="mt-1 text-[0.7rem] font-medium capitalize">
              {formatToday()}
            </p>
          </div>
          {user.permissions.includes("report.dashboard.read") ? (
            <Button asChild size="sm">
              <Link href="/reports">
                Buka laporan
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            title="Piutang terbuka"
            value={compactCurrencyFormatter.format(outstandingAmount)}
            description={`${outstandingInvoices.length} tagihan masih memiliki sisa pembayaran`}
            icon={CircleDollarSign}
            href="/invoices"
          />
        ) : null}
        {canReadFinance ? (
          <SummaryCard
            title="Biaya diproses"
            value={compactCurrencyFormatter.format(pendingExpenseAmount)}
            description={`${pendingExpenses.length} pengajuan menunggu proses`}
            icon={Receipt}
            href="/expenses"
          />
        ) : null}
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Task queue
                </p>
                <CardTitle className="mt-1">Pekerjaan prioritas</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tugas terbuka berdasarkan tenggat terdekat.
                </p>
              </div>
              {canReadTasks ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/projects/tasks">
                    Semua tugas
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingTasks.length > 0 ? (
              <div className="divide-y">
                {upcomingTasks.map((task, index) => {
                  const attention = task.status === "BLOCKED" || isOverdue(task);

                  return (
                    <div
                      key={task.id}
                      className="grid gap-3 px-4 py-3 transition-colors hover:bg-secondary/35 md:grid-cols-[32px_minmax(0,1fr)_auto_auto] md:items-center"
                    >
                      <span className="flex size-7 items-center justify-center rounded border bg-secondary/45 font-mono text-[0.62rem] font-semibold text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              attention ? "bg-destructive" : "bg-primary"
                            }`}
                          />
                          <p className="truncate text-xs font-semibold">{task.title}</p>
                        </div>
                        <p className="mt-1 truncate pl-3.5 font-mono text-[0.64rem] text-muted-foreground">
                          {task.projectCode} / {task.projectName}
                        </p>
                      </div>
                      <Badge
                        variant={attention ? "destructive" : "outline"}
                        className="justify-self-start md:justify-self-end"
                      >
                        {getBusinessLabel(task.status)}
                      </Badge>
                      <div className="flex min-w-28 items-center gap-1.5 text-[0.66rem] text-muted-foreground md:justify-end">
                        {attention ? (
                          <AlertTriangle className="size-3.5 text-destructive" />
                        ) : (
                          <CalendarClock className="size-3.5" />
                        )}
                        {formatDate(task.dueDate)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
                <CheckCircle2 className="size-6 text-primary" />
                <p className="mt-3 text-xs font-semibold">Tidak ada tugas mendesak</p>
                <p className="mt-1 max-w-sm text-[0.7rem] leading-5 text-muted-foreground">
                  Semua tugas yang dapat Anda akses sudah selesai atau belum memerlukan tindakan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3">
          <Card>
            <CardHeader className="border-b">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Workload telemetry
              </p>
              <CardTitle>Distribusi pekerjaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
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
                <p className="text-xs leading-5 text-muted-foreground">
                  Akun ini tidak memiliki akses ke data proyek atau tugas.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Shortcut
              </p>
              <CardTitle>Tindakan cepat</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-3">
              {visibleActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center justify-between gap-3 rounded-md border bg-background/45 px-3 py-2.5 transition-colors hover:border-primary/35 hover:bg-primary/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{action.label}</p>
                    <p className="mt-0.5 truncate text-[0.65rem] text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
              {visibleActions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Tidak ada tindakan cepat untuk peran akun ini.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {canReadProjects ? (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Status portofolio proyek</CardTitle>
              <p className="text-xs text-muted-foreground">
                Komposisi proyek yang dapat diakses akun ini.
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-px bg-border p-0">
              {[
                ["Aktif", activeProjects.length],
                ["Selesai", completedProjects.length],
                ["Ditunda", onHoldProjects.length],
                ["Total", projects.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-card px-4 py-3.5">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 font-mono text-xl font-semibold">
                    {numberFormatter.format(Number(value))}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {canReadFinance ? (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Kontrol keuangan</CardTitle>
              <p className="text-xs text-muted-foreground">
                Nilai yang masih membutuhkan penyelesaian.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-end justify-between gap-4 border-b pb-3">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Piutang terbuka
                  </p>
                  <p className="mt-1.5 text-base font-semibold">
                    {currencyFormatter.format(outstandingAmount)}
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {outstandingInvoices.length} invoice
                </span>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Pengeluaran diproses
                  </p>
                  <p className="mt-1.5 text-base font-semibold">
                    {currencyFormatter.format(pendingExpenseAmount)}
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {pendingExpenses.length} item
                </span>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/finance">Buka ringkasan keuangan</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {canReadHr && hrSummary ? (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Status SDM hari ini
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Monitoring kehadiran dan permintaan cuti.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between gap-4 border-b pb-2.5">
                <span className="text-muted-foreground">Sudah masuk</span>
                <strong className="font-mono">{numberFormatter.format(hrSummary.todayClockedIn)}</strong>
              </div>
              <div className="flex justify-between gap-4 border-b pb-2.5">
                <span className="text-muted-foreground">Belum masuk</span>
                <strong className="font-mono">{numberFormatter.format(hrSummary.todayNotClockedIn)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Cuti menunggu</span>
                <strong className="font-mono">{numberFormatter.format(hrSummary.pendingLeaveRequests)}</strong>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/hr">Buka ringkasan SDM</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
