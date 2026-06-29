import { redirect } from "next/navigation";

import { UserManagementClient } from "@/features/users/components/user-management-client";
import { listUsersAction } from "@/features/users/actions";
import { requirePagePermission } from "@/lib/permissions/page-guard";

export default async function SettingsUsersPage() {
  await requirePagePermission("user.read");

  const result = await listUsersAction({});

  if (!result.success) {
    redirect("/403");
  }

  return <UserManagementClient users={result.data} />;
}
