import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUserFromSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentUser = await getCurrentUserFromSession();

  if (!currentUser) {
    redirect("/login");
    throw new Error("UNREACHABLE");
  }

  if (currentUser.mustChangePassword) {
    redirect("/change-password");
  }

  return <DashboardShell user={currentUser}>{children}</DashboardShell>;
}
