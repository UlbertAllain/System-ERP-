"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Flag,
  History,
  Home,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import type { CurrentUser } from "@/types/auth";
import type { PermissionSlug } from "@/constants/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DashboardShellProps = {
  children: React.ReactNode;
  user?: CurrentUser | null;
  currentUser?: CurrentUser | null;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Overview" | "Operations" | "Finance" | "System";
  permissions: PermissionSlug[];
};

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    group: "Overview",
    permissions: [],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    group: "Overview",
    permissions: ["report.dashboard.read"],
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: History,
    group: "Overview",
    permissions: ["audit_log.read", "audit_log.read_all"],
  },

  {
    label: "Employees",
    href: "/employees",
    icon: UsersRound,
    group: "Operations",
    permissions: ["employee.read", "employee.read_all", "employee.read_own"],
  },
  {
    label: "Leave Requests",
    href: "/hr/leave-requests",
    icon: CalendarCheck2,
    group: "Operations",
    permissions: ["leave.read", "leave.read_all", "leave.read_own"],
  },
  {
    label: "Attendance",
    href: "/hr/attendance",
    icon: ClipboardList,
    group: "Operations",
    permissions: [
      "attendance.read",
      "attendance.read_all",
      "attendance.read_own",
    ],
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Building2,
    group: "Operations",
    permissions: ["client.read", "client.read_all"],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: Briefcase,
    group: "Operations",
    permissions: ["project.read", "project.read_all", "project.read_assigned"],
  },
  {
    label: "Project Members",
    href: "/projects/members",
    icon: Users,
    group: "Operations",
    permissions: ["project_member.read"],
  },
  {
    label: "Milestones",
    href: "/projects/milestones",
    icon: Flag,
    group: "Operations",
    permissions: ["milestone.read", "milestone.read_assigned"],
  },
  {
    label: "Tasks",
    href: "/projects/tasks",
    icon: LayoutDashboard,
    group: "Operations",
    permissions: ["task.read", "task.read_all", "task.read_assigned"],
  },

  {
    label: "Finance",
    href: "/finance",
    icon: Landmark,
    group: "Finance",
    permissions: ["finance.dashboard.read"],
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: FileText,
    group: "Finance",
    permissions: ["invoice.read", "invoice.read_all", "invoice.read_project"],
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
    group: "Finance",
    permissions: ["payment.read", "payment.read_all"],
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: Receipt,
    group: "Finance",
    permissions: ["expense.read", "expense.read_all", "expense.read_own"],
  },

  {
    label: "Company Settings",
    href: "/settings/company",
    icon: Settings,
    group: "System",
    permissions: ["setting.company.read", "setting.system.read"],
  },
  {
    label: "Users",
    href: "/settings/users",
    icon: Users,
    group: "System",
    permissions: ["user.read"],
  },
  {
    label: "Roles",
    href: "/settings/roles",
    icon: ShieldCheck,
    group: "System",
    permissions: ["role.read"],
  },
];

const navigationGroups: NavigationItem["group"][] = [
  "Overview",
  "Operations",
  "Finance",
  "System",
];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(email: string) {
  const namePart = email.split("@")[0] ?? "NX";
  const chunks = namePart.split(/[._-]/).filter(Boolean);

  if (chunks.length >= 2) {
    return `${chunks[0]?.[0] ?? "N"}${chunks[1]?.[0] ?? "X"}`.toUpperCase();
  }

  return namePart.slice(0, 2).toUpperCase();
}

function getDisplayName(user: CurrentUser | null | undefined) {
  if (!user) {
    return "Unknown operator";
  }

  const userRecord = user as CurrentUser & {
    name?: string | null;
    displayName?: string | null;
    fullName?: string | null;
  };

  return (
    userRecord.name ??
    userRecord.displayName ??
    userRecord.fullName ??
    user.email?.split("@")[0] ??
    "NEXTY Operator"
  );
}

function getRoleLabel(user: CurrentUser | null | undefined) {
  if (!user) {
    return "NO ROLE";
  }

  const userRecord = user as CurrentUser & {
    roleSlugs?: string[];
    roles?: string[] | Array<{ slug?: string; name?: string }>;
  };

  if (Array.isArray(userRecord.roleSlugs) && userRecord.roleSlugs.length > 0) {
    return (
      userRecord.roleSlugs[0]?.replaceAll("_", " ").toUpperCase() ?? "USER"
    );
  }

  if (Array.isArray(userRecord.roles) && userRecord.roles.length > 0) {
    const firstRole = userRecord.roles[0];

    if (typeof firstRole === "string") {
      return firstRole.replaceAll("_", " ").toUpperCase();
    }

    return (
      firstRole.slug?.replaceAll("_", " ").toUpperCase() ??
      firstRole.name?.toUpperCase() ??
      "USER"
    );
  }

  return "USER";
}

function canSeeNavigationItem(
  user: CurrentUser | null | undefined,
  item: NavigationItem,
) {
  if (item.permissions.length === 0) {
    return true;
  }

  if (user?.roleSlugs.includes("super_admin")) {
    return true;
  }

  return item.permissions.some((permission) =>
    user?.permissions.includes(permission),
  );
}

function SidebarContent({
  pathname,
  activeUser,
  onNavigate,
  onLogout,
  isLoggingOut,
}: {
  pathname: string;
  activeUser: CurrentUser | null | undefined;
  onNavigate?: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  const email = activeUser?.email ?? "unknown@nexty.local";
  const displayName = getDisplayName(activeUser);
  const roleLabel = getRoleLabel(activeUser);
  const status = activeUser?.status ?? "ACTIVE";
  const visibleNavigationItems = navigationItems.filter((item) =>
    canSeeNavigationItem(activeUser, item),
  );

  return (
    <aside className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-white/10 px-5 py-5">
        <Link
          href="/dashboard"
          prefetch={false}
          onClick={onNavigate}
          className="group flex items-center gap-3"
        >
          <div className="relative flex size-11 items-center justify-center rounded-lg border border-lime-300/25 bg-lime-300/12 text-lime-200 shadow-[0_0_32px_rgba(190,242,100,0.14)]">
            <Sparkles className="size-5" />
            <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-slate-950 bg-lime-300" />
          </div>

          <div>
            <p className="font-display text-lg font-black leading-none text-white">
              NEXTY ERP
            </p>
            <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-lime-200/70">
              Operations Suite
            </p>
          </div>
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
        <nav className="space-y-6">
          {navigationGroups.map((group) => {
            const items = navigationItems.filter(
              (item) => item.group === group && visibleNavigationItems.includes(item),
            );

            if (items.length === 0) {
              return null;
            }

            return (
              <div key={group}>
                <p className="mb-2 px-3 text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-500">
                  {group}
                </p>

                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onClick={onNavigate}
                        className={classNames(
                          "group relative flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                          active
                            ? "bg-lime-300 text-slate-950 shadow-[0_12px_30px_rgba(190,242,100,0.18)]"
                            : "text-slate-300 hover:bg-white/8 hover:text-white",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={classNames(
                              "flex size-8 shrink-0 items-center justify-center rounded-md border transition",
                              active
                                ? "border-slate-950/10 bg-slate-950 text-lime-200"
                                : "border-white/10 bg-white/5 text-slate-400 group-hover:text-white",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="truncate">{item.label}</span>
                        </span>

                        {active ? (
                          <ChevronRight className="size-4 shrink-0" />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-lime-300 text-sm font-black text-slate-950">
              {getInitials(email)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-white">
                  {displayName}
                </p>
                <span className="size-2 shrink-0 rounded-full bg-lime-300" />
              </div>

              <p className="mt-0.5 truncate text-xs text-slate-400">{email}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="border-white/10 bg-white/8 text-[0.65rem] text-slate-200 hover:bg-white/8">
                  {roleLabel}
                </Badge>
                <Badge className="border-lime-300/20 bg-lime-300/12 text-[0.65rem] text-lime-100 hover:bg-lime-300/12">
                  {status}
                </Badge>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={isLoggingOut}
            onClick={onLogout}
            className="mt-4 h-10 w-full justify-center gap-2 rounded-lg border-white/10 bg-white/5 text-slate-100 hover:bg-red-500/15 hover:text-red-100"
          >
            <LogOut className="size-4" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function DashboardShell({
  children,
  user,
  currentUser,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();

  const activeUser = currentUser ?? user;

  const currentSection = useMemo(() => {
    const activeItem = navigationItems.find((item) =>
      isActiveRoute(pathname, item.href),
    );

    return activeItem ?? navigationItems[0];
  }, [pathname]);

  function handleLogout() {
    startLogoutTransition(async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } finally {
        router.replace("/login");
        router.refresh();
      }
    });
  }

  return (
    <div className="nexty-shell min-h-screen">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[292px]">
        <SidebarContent
          pathname={pathname}
          activeUser={activeUser}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[86vw] max-w-[340px] shadow-2xl">
            <SidebarContent
              pathname={pathname}
              activeUser={activeUser}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[292px]">
        <header className="sticky top-0 z-30 border-b border-slate-950/10 bg-background/78 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-lg lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                {mobileOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
                )}
              </Button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="hidden size-2 rounded-full bg-lime-500 md:block" />
                  <p className="truncate text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {currentSection.group}
                  </p>
                </div>
                <h1 className="truncate font-display text-xl font-black md:text-2xl">
                  {currentSection.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="hidden rounded-full md:inline-flex"
              >
                Session Active
              </Badge>

              <div className="hidden items-center gap-3 rounded-lg border bg-card/75 px-3 py-2 shadow-sm md:flex">
                <div className="flex size-8 items-center justify-center rounded-md bg-slate-950 text-xs font-black text-lime-200">
                  {getInitials(activeUser?.email ?? "NX")}
                </div>
                <div className="min-w-0">
                  <p className="max-w-[180px] truncate text-xs font-bold">
                    {getDisplayName(activeUser)}
                  </p>
                  <p className="max-w-[180px] truncate text-[0.68rem] text-muted-foreground">
                    {activeUser?.email ?? "unknown@nexty.local"}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="rounded-lg"
                title="Logout"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
