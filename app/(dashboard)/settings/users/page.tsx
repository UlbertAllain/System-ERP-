import { UserManagementClient } from "@/features/users/components/user-management-client";
import { listUsersPaginatedAction } from "@/features/users/actions";
import { requirePagePermission } from "@/lib/permissions/page-guard";
import type { RoleSlug } from "@/constants/permissions";
import type { UserStatus } from "@/types/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SettingsUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsUsersPage({
  searchParams,
}: SettingsUsersPageProps) {
  await requirePagePermission("user.read");

  const params = (await searchParams) ?? {};
  const search = getParam(params, "search") ?? "";
  const status = getParam(params, "status") as UserStatus | undefined;
  const roleSlug = getParam(params, "roleSlug") as RoleSlug | undefined;
  const page = getParam(params, "page") ?? "1";
  const pageSize = getParam(params, "pageSize") ?? "10";

  const result = await listUsersPaginatedAction({
    search,
    status: status || undefined,
    roleSlug: roleSlug || undefined,
    page: Number(page),
    pageSize: Number(pageSize),
  });

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Data Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {result.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <UserManagementClient
      users={result.data.items}
      pagination={{
        totalItems: result.data.totalItems,
        page: result.data.page,
        pageSize: result.data.pageSize,
        totalPages: result.data.totalPages,
        search,
        status: status ?? "",
        roleSlug: roleSlug ?? "",
      }}
    />
  );
}
