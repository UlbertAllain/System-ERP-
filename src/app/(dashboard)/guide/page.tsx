import { redirect } from "next/navigation";

import { RoleGuideClient } from "@/modules/guide/components/role-guide-client";
import { getCurrentUserFromSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GuidePage() {
  const user = await getCurrentUserFromSession();

  if (!user) {
    redirect("/login");
    throw new Error("UNREACHABLE");
  }

  return (
    <RoleGuideClient
      userName={user.name || user.email.split("@")[0] || "Pengguna"}
      roleSlugs={user.roleSlugs}
      permissions={user.permissions}
    />
  );
}
