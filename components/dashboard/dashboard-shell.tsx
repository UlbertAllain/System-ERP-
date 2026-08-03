"use client";

import { signOut } from "firebase/auth";
import {
  Activity,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";

import { NextyLabsMark } from "@/components/brand/nexty-labs-mark";
import {
  canSeeNavigationItem,
  getCurrentNavigationItem,
  isActiveRoute,
  navigationGroups,
  navigationItems,
} from "@/components/dashboard/navigation";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearSessionAction } from "@/features/auth/actions";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { getBusinessLabel } from "@/lib/ui/business-labels";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/types/auth";

type DashboardShellProps = {
  children: ReactNode;
  user: CurrentUser;
};

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0] || "NL";
  const chunks = source.split(/\s+/).filter(Boolean);

  if (chunks.length >= 2) {
    return `${chunks[0]?.[0] ?? "N"}${chunks[1]?.[0] ?? "L"}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function getRoleLabel(user: CurrentUser): string {
  const uniqueRoles = Array.from(new Set(user.roleSlugs.filter(Boolean)));

  if (uniqueRoles.length === 0) {
    return "Pengguna";
  }

  const firstRole = getBusinessLabel(uniqueRoles[0]);

  return uniqueRoles.length > 1
    ? `${firstRole} +${uniqueRoles.length - 1}`
    : firstRole;
}

function Sidebar({
  pathname,
  user,
  onNavigate,
  onLogout,
  isLoggingOut,
}: {
  pathname: string;
  user: CurrentUser;
  onNavigate?: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  const visibleItems = navigationItems.filter((item) =>
    canSeeNavigationItem(user, item),
  );

  return (
    <aside className="erp-sidebar flex h-full flex-col">
      <div className="flex h-[68px] items-center border-b border-sidebar-border px-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="min-w-0 text-primary"
        >
          <NextyLabsMark className="gap-2.5" />
        </Link>
      </div>

      <div className="border-b border-sidebar-border px-3 py-3">
        <div className="rounded-md border border-sidebar-border bg-secondary/40 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.11em] text-sidebar-muted">
                Workspace
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-sidebar-foreground">
                Enterprise Operations
              </p>
            </div>
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded border border-primary/25 bg-primary/10 text-primary">
              <Activity className="size-3.5" />
            </span>
          </div>
        </div>
      </div>

      <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 py-4">
        <div className="space-y-5">
          {navigationGroups.map((group) => {
            const groupItems = visibleItems.filter(
              (item) => item.group === group,
            );

            if (groupItems.length === 0) return null;

            return (
              <section key={group}>
                <p className="mb-1.5 px-2.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-sidebar-muted/75">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.78rem] font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-muted hover:bg-secondary/60 hover:text-sidebar-foreground",
                        )}
                      >
                        {active ? (
                          <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />
                        ) : null}
                        <Icon
                          className={cn(
                            "size-[0.95rem] shrink-0 transition-colors",
                            active
                              ? "text-primary"
                              : "text-sidebar-muted group-hover:text-sidebar-foreground",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {active ? (
                          <ChevronRight className="size-3 shrink-0 text-primary" />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-2.5">
        <div className="rounded-md border border-sidebar-border bg-secondary/35 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary text-[0.68rem] font-bold text-primary-foreground">
              {getInitials(user.name, user.email)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {user.name || user.email.split("@")[0]}
              </p>
              <p className="mt-1 truncate text-[0.66rem] text-sidebar-muted">
                {getRoleLabel(user)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={isLoggingOut}
              onClick={onLogout}
              className="shrink-0 text-sidebar-muted hover:text-destructive"
              aria-label="Keluar dari sistem"
              title="Keluar dari sistem"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const currentSection = useMemo(
    () => getCurrentNavigationItem(pathname),
    [pathname],
  );

  function handleLogout() {
    startLogoutTransition(async () => {
      await Promise.allSettled([
        clearSessionAction(),
        signOut(getFirebaseClientAuth()),
      ]);
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[236px]">
        <Sidebar
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[86vw] max-w-[286px] shadow-2xl">
            <Sidebar
              pathname={pathname}
              user={user}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[236px]">
        <header className="erp-topbar sticky top-0 z-30">
          <div className="flex h-[60px] items-center justify-between gap-4 px-3 md:px-5 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setMobileOpen((open) => !open)}
              >
                {mobileOpen ? (
                  <X className="size-4" />
                ) : (
                  <Menu className="size-4" />
                )}
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                  <span>ERP</span>
                  <ChevronRight className="size-2.5" />
                  <span>{currentSection.group}</span>
                </div>
                <h1 className="mt-1 truncate text-sm font-semibold leading-none text-foreground md:text-[0.95rem]">
                  {currentSection.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-[0.68rem] text-muted-foreground xl:flex">
                <span className="size-1.5 rounded-full bg-success" />
                Sistem operasional
              </div>
              <ThemeToggle />
              <div className="hidden items-center gap-2 rounded-md border bg-card py-1.5 pl-1.5 pr-2.5 md:flex">
                <div className="flex size-7 items-center justify-center rounded bg-primary text-[0.62rem] font-bold text-primary-foreground">
                  {getInitials(user.name, user.email)}
                </div>
                <div className="max-w-36 leading-tight">
                  <p className="truncate text-[0.7rem] font-semibold">
                    {user.name || user.email.split("@")[0]}
                  </p>
                  <p className="mt-0.5 truncate text-[0.61rem] text-muted-foreground">
                    {getRoleLabel(user)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative min-h-[calc(100vh-60px)] overflow-hidden px-3 py-4 md:px-5 md:py-5 lg:px-6">
          <div className="erp-page-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto w-full max-w-[1540px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
