import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Receipt,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PermissionSlug } from "@/constants/permissions";
import { listClientsService } from "@/features/clients/services/client-service";
import { listExpensesService } from "@/features/finance/services/expense-service";
import { listInvoicesService } from "@/features/finance/services/invoice-service";
import { listPaymentsService } from "@/features/finance/services/payment-service";
import { getHrDashboardSummaryService } from "@/features/hr/services/hr-dashboard-service";
import {
  filterProjectsForUser,
  filterTasksForUser,
} from "@/features/projects/actions/project-access-scope";
import { listProjectsService } from "@/features/projects/services/project-service";
import { listTasksService } from "@/features/projects/services/task-service";
import { getCurrentUserFromSession } from "@/lib/auth/session";
import type { CurrentUser } from "@/types/auth";
import type { ProjectListItem } from "@/types/project";
import type { TaskListItem } from "@/types/task";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type KpiCardProps = {
  title: string;
  value: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger";
};

type QuickAction = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: PermissionSlug[];
};

const moneyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

const quickActions: QuickAction[] = [
  {
    label: "Create invoice",
    href: "/invoices",
    icon: FileText,
    permissions: ["invoice.create"],
  },
  {
    label: "Record payment",
    href: "/payments",
    icon: Banknote,
    permissions: ["payment.create"],
  },
  {
    label: "Submit expense",
    href: "/expenses",
    icon: Receipt,
    permissions: ["expense.create"],
  },
  {
    label: "Manage projects",
    href: "/projects",
    icon: BriefcaseBusiness,
    permissions: ["project.read", "project.read_all", "project.read_assigned"],
  },
  {
    label: "Review attendance",
    href: "/hr/attendance",
    icon: CalendarCheck2,
    permissions: ["attendance.read", "attendance.read_all"],
  },
  {
    label: "Open reports",
    href: "/reports",
    icon: ClipboardList,
    permissions: ["report.dashboard.read"],
  },
];

function hasAnyPermission(user: CurrentUser, permissions: PermissionSlug[]) {
  return permissions.some((permission) => user.permissions.includes(permission));
}

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function getDisplayName(user: CurrentUser) {
  const userRecord = user as CurrentUser & {
    name?: string | null;
    displayName?: string | null;
    fullName?: string | null;
  };

  return (
    userRecord.name ??
    userRecord.displayName ??
    userRecord.fullName ??
    user.email.split("@")[0] ??
    "NEXTY Operator"
  );
}

function getPrimaryRole(user: CurrentUser) {
  return user.roleSlugs[0]?.replaceAll("_", " ").toUpperCase() ?? "USER";
}

function getCompletionRate(tasks: TaskListItem[]) {
  if (tasks.length === 0) {
    return 0;
  }

  const doneTasks = tasks.filter((task) => task.status === "DONE").length;

  return Math.round((doneTasks / tasks.length) * 100);
}

function getActiveProjects(projects: ProjectListItem[]) {
  return projects.filter((project) =>
    ["PLANNING", "IN_PROGRESS", "ON_HOLD"].includes(project.status),
  );
}

function getUpcomingTasks(tasks: TaskListItem[]) {
  return [...tasks]
    .filter((task) => task.status !== "DONE" && task.status !== "CANCELLED")
    .sort((a, b) => {
      const aTime = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;

      return aTime - bTime;
    })
    .slice(0, 6);
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

function KpiCard({
  title,
  value,
  caption,
  icon: Icon,
  tone = "default",
}: KpiCardProps) {
  const toneClass = {
    default: "bg-slate-950 text-lime-200",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-500 text-slate-950",
    danger: "bg-red-600 text-white",
  }[tone];

  return (
    <Card className="rounded-lg border bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`flex size-9 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const currentUser = await getCurrentUserFromSession();

  if (!currentUser) {
    redirect("/login");
  }

  const canReadProjects = hasAnyPermission(currentUser, [
    "project.read",
    "project.read_all",
    "project.read_assigned",
  ]);
  const canReadTasks = hasAnyPermission(currentUser, [
    "task.read",
    "task.read_all",
    "task.read_assigned",
  ]);
  const canReadFinance = hasAnyPermission(currentUser, [
    "finance.dashboard.read",
    "invoice.read",
    "invoice.read_all",
    "payment.read",
    "payment.read_all",
    "expense.read",
    "expense.read_all",
  ]);
  const canReadClients = hasAnyPermission(currentUser, [
    "client.read",
    "client.read_all",
  ]);
  const canReadHr = hasAnyPermission(currentUser, [
    "hr.dashboard.read",
    "employee.read",
    "employee.read_all",
    "leave.read",
    "leave.read_all",
    "attendance.read",
    "attendance.read_all",
  ]);

  const [rawProjects, rawTasks, invoices, payments, expenses, clients, hr] =
    await Promise.all([
      canReadProjects ? listProjectsService() : Promise.resolve([]),
      canReadTasks ? listTasksService({}) : Promise.resolve([]),
      canReadFinance ? listInvoicesService({}) : Promise.resolve([]),
      canReadFinance ? listPaymentsService({}) : Promise.resolve([]),
      canReadFinance ? listExpensesService({}) : Promise.resolve([]),
      canReadClients ? listClientsService() : Promise.resolve([]),
      canReadHr ? getHrDashboardSummaryService() : Promise.resolve(null),
    ]);

  const projects = canReadProjects
    ? await filterProjectsForUser(currentUser, rawProjects)
    : [];
  const tasks = canReadTasks
    ? await filterTasksForUser(currentUser, rawTasks)
    : [];

  const activeProjects = getActiveProjects(projects);
  const blockedTasks = tasks.filter((task) => task.status === "BLOCKED");
  const scheduledOpenTasks = tasks.filter(
    (task) =>
      task.dueDate !== null &&
      task.status !== "DONE" &&
      task.status !== "CANCELLED",
  );
  const upcomingTasks = getUpcomingTasks(tasks);

  const activeInvoices = invoices.filter((invoice) => invoice.status !== "VOID");
  const outstandingAmount = activeInvoices.reduce(
    (total, invoice) => total + invoice.remainingAmount,
    0,
  );
  const confirmedPayments = payments.filter(
    (payment) => payment.status === "CONFIRMED",
  );
  const cashIn = confirmedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const cashOut = expenses
    .filter((expense) => expense.status === "PAID")
    .reduce((total, expense) => total + expense.amount, 0);
  const pendingExpenses = expenses.filter((expense) =>
    ["SUBMITTED", "APPROVED"].includes(expense.status),
  );

  const visibleQuickActions = quickActions.filter((action) =>
    hasAnyPermission(currentUser, action.permissions),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card/95 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md">
                {getPrimaryRole(currentUser)}
              </Badge>
              <Badge className="rounded-md bg-emerald-600 text-white hover:bg-emerald-600">
                {currentUser.status}
              </Badge>
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">
              Welcome back, {getDisplayName(currentUser)}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Ringkasan operasional hari ini berdasarkan role dan permission
              aktif akun ini.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Permissions
              </p>
              <p className="mt-1 text-xl font-black">
                {formatNumber(currentUser.permissions.length)}
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Roles
              </p>
              <p className="mt-1 text-xl font-black">
                {formatNumber(currentUser.roleSlugs.length)}
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Session
              </p>
              <p className="mt-1 text-xl font-black">Active</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {canReadFinance ? (
          <>
            <KpiCard
              title="Cash In"
              value={formatMoney(cashIn)}
              caption="Confirmed payments"
              icon={Banknote}
              tone="success"
            />
            <KpiCard
              title="Outstanding"
              value={formatMoney(outstandingAmount)}
              caption={`${formatNumber(activeInvoices.length)} active invoices`}
              icon={FileText}
              tone={outstandingAmount > 0 ? "warning" : "success"}
            />
          </>
        ) : null}

        {canReadProjects ? (
          <KpiCard
            title="Active Projects"
            value={formatNumber(activeProjects.length)}
            caption={`${formatNumber(projects.length)} visible projects`}
            icon={BriefcaseBusiness}
          />
        ) : null}

        {canReadTasks ? (
          <KpiCard
            title="Task Completion"
            value={`${getCompletionRate(tasks)}%`}
            caption={`${formatNumber(blockedTasks.length)} blocked, ${formatNumber(scheduledOpenTasks.length)} scheduled`}
            icon={CheckCircle2}
            tone={blockedTasks.length > 0 ? "danger" : "success"}
          />
        ) : null}

        {canReadHr && hr ? (
          <KpiCard
            title="People Today"
            value={formatNumber(hr.todayClockedIn)}
            caption={`${formatNumber(hr.pendingLeaveRequests)} pending leave requests`}
            icon={UsersRound}
          />
        ) : null}

        {canReadClients ? (
          <KpiCard
            title="Active Clients"
            value={formatNumber(
              clients.filter((client) => client.status === "ACTIVE").length,
            )}
            caption={`${formatNumber(clients.length)} visible clients`}
            icon={ShieldCheck}
          />
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="rounded-lg border bg-card/95 shadow-sm">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Operational Queue</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Task terdekat dan risiko delivery yang perlu dipantau.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-md">
                <Link href="/projects/tasks" prefetch={false}>
                  Open tasks
                  <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {canReadTasks && upcomingTasks.length > 0 ? (
              <div className="divide-y">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_160px_130px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{task.title}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {task.projectCode} - {task.projectName}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{task.assigneeName ?? "-"}</p>
                      <p className="text-muted-foreground">{task.priority}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 md:justify-end">
                      <Badge variant="outline" className="rounded-md">
                        {task.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(task.dueDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                Tidak ada task terbuka yang perlu ditampilkan untuk akun ini.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card/95 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {visibleQuickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Button
                    key={action.href}
                    asChild
                    variant="outline"
                    className="h-11 w-full justify-between rounded-md"
                  >
                    <Link href={action.href} prefetch={false}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" />
                        {action.label}
                      </span>
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                );
              })}

              {visibleQuickActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada shortcut untuk permission akun ini.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card/95 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-sm">
              {canReadTasks ? (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-4 text-red-600" />
                  <p>
                    {formatNumber(blockedTasks.length)} blocked task dan{" "}
                    {formatNumber(scheduledOpenTasks.length)} scheduled open
                    task.
                  </p>
                </div>
              ) : null}
              {canReadFinance ? (
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 size-4 text-amber-600" />
                  <p>
                    {formatNumber(pendingExpenses.length)} expense menunggu
                    proses, cash net {formatMoney(cashIn - cashOut)}.
                  </p>
                </div>
              ) : null}
              {canReadHr && hr ? (
                <div className="flex items-start gap-3">
                  <CalendarCheck2 className="mt-0.5 size-4 text-slate-700" />
                  <p>
                    {formatNumber(hr.todayNotClockedIn)} employee aktif belum
                    clock in hari ini.
                  </p>
                </div>
              ) : null}
              {!canReadTasks && !canReadFinance && !canReadHr ? (
                <p className="text-muted-foreground">
                  Tidak ada alert operasional untuk permission akun ini.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
