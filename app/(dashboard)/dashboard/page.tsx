import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarClock,
  Command,
  FileText,
  Fingerprint,
  Gauge,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

import { getCurrentUserFromSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object") {
    return value as UnknownRecord;
  }

  return {};
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object") {
        const record = item as UnknownRecord;
        const slug = record.slug;
        const name = record.name;

        if (typeof slug === "string") {
          return slug;
        }

        if (typeof name === "string") {
          return name;
        }
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function getUserRoles(user: unknown): string[] {
  const record = asRecord(user);

  const directRoles = normalizeStringArray(record.roles);
  const roleSlugs = normalizeStringArray(record.roleSlugs);

  const roles = directRoles.length > 0 ? directRoles : roleSlugs;

  return roles.length > 0 ? roles : ["unassigned"];
}

function getUserPermissions(user: unknown): string[] {
  const record = asRecord(user);

  return normalizeStringArray(record.permissions);
}

function getUserTextField(
  user: unknown,
  keys: string[],
  fallback: string,
): string {
  const record = asRecord(user);

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

const commandModules = [
  {
    title: "Finance Control",
    description: "Invoice, payment, expense, cashflow, dan profit view.",
    href: "/finance",
    icon: Landmark,
    meta: "Revenue Ops",
  },
  {
    title: "Project Ops",
    description: "Project, member, milestone, task, dan delivery tracking.",
    href: "/projects",
    icon: LayoutDashboard,
    meta: "Delivery",
  },
  {
    title: "Client Registry",
    description: "Client profile, status, logo, dan commercial relation.",
    href: "/clients",
    icon: Building2,
    meta: "CRM",
  },
  {
    title: "HR Command",
    description: "Employee, leave request, attendance, dan HR summary.",
    href: "/employees",
    icon: UsersRound,
    meta: "People",
  },
];

const quickActions = [
  {
    label: "Create Invoice",
    href: "/invoices",
    icon: FileText,
  },
  {
    label: "Record Payment",
    href: "/payments",
    icon: BadgeCheck,
  },
  {
    label: "Submit Expense",
    href: "/expenses",
    icon: Receipt,
  },
  {
    label: "Open Reports",
    href: "/reports",
    icon: BarChart3,
  },
];

export default async function DashboardPage() {
  const currentUser = await getCurrentUserFromSession();

  if (!currentUser) {
    redirect("/login");
  }

  const roles = getUserRoles(currentUser);
  const permissions = getUserPermissions(currentUser);
  const email = getUserTextField(currentUser, ["email"], "unknown@nexty.local");
  const name = getUserTextField(
    currentUser,
    ["name", "displayName", "fullName"],
    "NEXTY Founder",
  );
  const status = getUserTextField(currentUser, ["status"], "ACTIVE");

  return (
    <div className="space-y-8">
      <section className="nexty-panel-dark nexty-command-border overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-7">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-lime-300/30 bg-lime-300/15 text-lime-100 hover:bg-lime-300/15">
                <Sparkles className="mr-1 size-3.5" />
                NEXTY Command OS
              </Badge>

              <Badge className="border-white/10 bg-white/10 text-white hover:bg-white/10">
                {status}
              </Badge>
            </div>

            <div className="max-w-3xl">
              <p className="nexty-kicker text-lime-200/80">Dashboard</p>
              <h1 className="mt-4 max-w-3xl text-balance text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">
                Internal control center for serious operations.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                Backend auth, session, permission, finance, project, HR, client,
                reports, dan audit log sudah menjadi satu operating layer.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="gap-2 bg-lime-300 text-slate-950 hover:bg-lime-200"
              >
                <Link href="/reports" prefetch={false}>
                  Open Reports
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/audit-logs" prefetch={false}>
                  Audit Trail
                  <Fingerprint className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/54">Authenticated operator</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                  {name}
                </h2>
              </div>

              <div className="flex size-12 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/15 text-lime-100">
                <UserRound className="size-6" />
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-white/48">Email</p>
                <p className="mt-1 font-medium text-white">{email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-white/48">Roles</p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {roles.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-white/48">Permissions</p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {permissions.length}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-lime-100"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="nexty-stat">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              Session Status
              <LockKeyhole className="size-5 text-lime-700" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight">{status}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              HTTP-only session cookie active.
            </p>
          </CardContent>
        </Card>

        <Card className="nexty-stat">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              Role Layer
              <ShieldCheck className="size-5 text-cyan-700" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight">{roles.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Active role binding attached.
            </p>
          </CardContent>
        </Card>

        <Card className="nexty-stat">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              Permission Matrix
              <Command className="size-5 text-orange-700" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight">
              {permissions.length}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Access rules resolved from role.
            </p>
          </CardContent>
        </Card>

        <Card className="nexty-stat">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              System Mode
              <Gauge className="size-5 text-slate-700" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight">MVP</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Internal production candidate.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="nexty-panel overflow-hidden rounded-[1.5rem]">
          <CardHeader className="border-b bg-white/35">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="nexty-kicker">Core Modules</p>
                <CardTitle className="mt-2 text-2xl">
                  Operational routes
                </CardTitle>
              </div>
              <Badge variant="outline">LIVE</Badge>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            {commandModules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.href}
                  href={module.href}
                  prefetch={false}
                  className="group rounded-2xl border bg-card/70 p-5 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white/70 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-lime-200">
                      <Icon className="size-5" />
                    </div>

                    <ArrowUpRight className="size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
                      {module.meta}
                    </p>
                    <h3 className="mt-2 text-xl font-black tracking-tight">
                      {module.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="nexty-panel overflow-hidden rounded-[1.5rem]">
          <CardHeader className="border-b bg-white/35">
            <p className="nexty-kicker">Shortcuts</p>
            <CardTitle className="mt-2 text-2xl">Quick command</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 p-5">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Button
                  key={action.href}
                  asChild
                  variant="outline"
                  className="h-14 w-full justify-between rounded-2xl border-slate-300 bg-white/40 px-4 hover:bg-white"
                >
                  <Link href={action.href} prefetch={false}>
                    <span className="flex items-center gap-3">
                      <Icon className="size-5" />
                      {action.label}
                    </span>
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              );
            })}

            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-950 p-5 text-white">
              <div className="flex items-center gap-3">
                <CalendarClock className="size-5 text-lime-200" />
                <p className="font-bold">Next phase</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/64">
                Setelah dashboard shell dirapikan, kita polish table, badge,
                dialog, dan mobile layout supaya seluruh ERP terasa konsisten.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
