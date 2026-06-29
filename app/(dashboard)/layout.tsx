import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUserFromSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUserFromSession();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.mustChangePassword) {
    redirect("/change-password");
  }

  return <DashboardShell user={currentUser}>{children}</DashboardShell>;
}
