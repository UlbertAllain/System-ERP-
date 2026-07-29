"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { useMemo, useState, useTransition, type ReactNode } from "react";

import { clearSessionAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { getBusinessLabel } from "@/lib/ui/business-labels";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import type { CurrentUser } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { NextyLabsMark } from "@/components/brand/nexty-labs-mark";
import {
  canSeeNavigationItem,
  getCurrentNavigationItem,
  isActiveRoute,
  navigationGroups,
  navigationItems,
} from "@/components/dashboard/navigation";

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
    ? `${firstRole} +${uniqueRoles.length - 1} peran`
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
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="text-gold">
          <NextyLabsMark inverted />
        </Link>
      </div>

      <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-6">
          {navigationGroups.map((group) => {
            const groupItems = visibleItems.filter(
              (item) => item.group === group,
            );

            if (groupItems.length === 0) return null;

            return (
              <section key={group}>
                <p className="mb-2 px-3 text-[0.66rem] font-semibold uppercase tracking-[0.19em] text-white/35">
                  {group}
                </p>
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group flex min-h-10 items-center justify-between rounded-md px-3 py-2.5 text-[0.82rem] font-medium transition-all",
                          active
                            ? "bg-white/[0.09] text-white shadow-[inset_3px_0_0_#e1a94d]"
                            : "text-white/62 hover:bg-white/[0.055] hover:text-white",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              "size-[1.05rem] transition-colors",
                              active
                                ? "text-gold"
                                : "text-white/42 group-hover:text-gold/85",
                            )}
                          />
                          {item.label}
                        </span>
                        {active ? (
                          <ChevronRight className="size-3.5 text-gold" />
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

      <div className="border-t border-white/10 p-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-gold/10 text-sm font-semibold text-gold">
              {getInitials(user.name, user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user.name || user.email.split("@")[0]}
              </p>
              <p className="truncate text-xs text-white/45">
                {getRoleLabel(user)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={isLoggingOut}
            onClick={onLogout}
            className="mt-3 w-full justify-start gap-2 text-white/55 hover:bg-white/[0.07] hover:text-white"
          >
            <LogOut className="size-4" />
            {isLoggingOut ? "Sedang keluar..." : "Keluar dari sistem"}
          </Button>
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
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[252px]">
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
            className="absolute inset-0 bg-[#06162a]/65 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[86vw] max-w-[300px] shadow-2xl">
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

      <div className="lg:pl-[252px]">
        <header className="erp-topbar sticky top-0 z-30">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen((open) => !open)}
              >
                {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </Button>
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Nexty Labs ERP</span>
                  <ChevronRight className="size-3" />
                  <span>{currentSection.group}</span>
                </div>
                <h1 className="font-display truncate text-xl font-semibold leading-none text-foreground md:text-[1.45rem]">
                  {currentSection.label}
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-md border border-border/70 bg-card px-3 py-2 shadow-sm md:flex">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(user.name, user.email)}
              </div>
              <div className="max-w-44 leading-tight">
                <p className="truncate text-xs font-semibold">
                  {user.name || user.email.split("@")[0]}
                </p>
                <p className="truncate text-[0.68rem] text-muted-foreground">
                  {getRoleLabel(user)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
