import type { ComponentType } from "react";
import {
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  ClipboardCheck,
  FileText,
  History,
  Home,
  Receipt,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";

import type { PermissionSlug } from "@/constants/permissions";
import type { CurrentUser } from "@/types/auth";

export type NavigationGroup =
  | "Ringkasan"
  | "Operasional"
  | "Keuangan"
  | "Sumber Daya"
  | "Sistem";

export type NavigationItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  group: NavigationGroup;
  permissions: PermissionSlug[];
};

export const navigationGroups: NavigationGroup[] = [
  "Ringkasan",
  "Operasional",
  "Keuangan",
  "Sumber Daya",
  "Sistem",
];

export const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    group: "Ringkasan",
    permissions: [],
  },
  {
    label: "Panduan Penggunaan",
    href: "/guide",
    icon: BookOpenCheck,
    group: "Ringkasan",
    permissions: [],
  },
  {
    label: "Laporan Manajemen",
    href: "/reports",
    icon: BarChart3,
    group: "Ringkasan",
    permissions: ["report.dashboard.read"],
  },
  {
    label: "Proyek",
    href: "/projects",
    icon: BriefcaseBusiness,
    group: "Operasional",
    permissions: ["project.read", "project.read_all", "project.read_assigned"],
  },
  {
    label: "Tugas",
    href: "/projects/tasks",
    icon: ClipboardCheck,
    group: "Operasional",
    permissions: ["task.read", "task.read_all", "task.read_assigned"],
  },
  {
    label: "Pelanggan",
    href: "/clients",
    icon: Building2,
    group: "Operasional",
    permissions: ["client.read", "client.read_all"],
  },
  {
    label: "Ringkasan Keuangan",
    href: "/finance",
    icon: WalletCards,
    group: "Keuangan",
    permissions: ["finance.dashboard.read"],
  },
  {
    label: "Tagihan",
    href: "/invoices",
    icon: FileText,
    group: "Keuangan",
    permissions: ["invoice.read", "invoice.read_all", "invoice.read_project"],
  },
  {
    label: "Pembayaran",
    href: "/payments",
    icon: WalletCards,
    group: "Keuangan",
    permissions: ["payment.read", "payment.read_all"],
  },
  {
    label: "Pengeluaran",
    href: "/expenses",
    icon: Receipt,
    group: "Keuangan",
    permissions: ["expense.read", "expense.read_all", "expense.read_own"],
  },
  {
    label: "Ringkasan SDM",
    href: "/hr",
    icon: UserRoundCheck,
    group: "Sumber Daya",
    permissions: [
      "hr.dashboard.read",
      "employee.read",
      "employee.read_all",
      "leave.read",
      "leave.read_all",
      "leave.read_own",
      "attendance.read",
      "attendance.read_all",
      "attendance.read_own",
    ],
  },
  {
    label: "Karyawan",
    href: "/employees",
    icon: Users,
    group: "Sumber Daya",
    permissions: ["employee.read", "employee.read_all", "employee.read_own"],
  },
  {
    label: "Kehadiran",
    href: "/hr/attendance",
    icon: CalendarCheck2,
    group: "Sumber Daya",
    permissions: ["attendance.read", "attendance.read_all", "attendance.read_own"],
  },
  {
    label: "Izin dan Cuti",
    href: "/hr/leave-requests",
    icon: CalendarCheck2,
    group: "Sumber Daya",
    permissions: ["leave.read", "leave.read_all", "leave.read_own"],
  },
  {
    label: "Pengguna",
    href: "/settings/users",
    icon: ShieldCheck,
    group: "Sistem",
    permissions: ["user.read"],
  },
  {
    label: "Peran dan Hak Akses",
    href: "/settings/roles",
    icon: ShieldCheck,
    group: "Sistem",
    permissions: ["role.read"],
  },
  {
    label: "Profil Perusahaan",
    href: "/settings/company",
    icon: Settings,
    group: "Sistem",
    permissions: ["setting.company.read", "setting.system.read"],
  },
  {
    label: "Riwayat Aktivitas",
    href: "/audit-logs",
    icon: History,
    group: "Sistem",
    permissions: ["audit_log.read"],
  },
];

export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function canSeeNavigationItem(
  user: CurrentUser,
  item: NavigationItem,
): boolean {
  if (item.permissions.length === 0 || user.roleSlugs.includes("super_admin")) {
    return true;
  }

  return item.permissions.some((permission) =>
    user.permissions.includes(permission),
  );
}

export function getCurrentNavigationItem(pathname: string): NavigationItem {
  return (
    [...navigationItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => isActiveRoute(pathname, item.href)) ?? navigationItems[0]
  );
}
