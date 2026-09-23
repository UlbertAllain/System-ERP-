import { getRolePermissionEditorDataAction } from "@/features/roles/actions";
import { RolePermissionEditorClient } from "@/features/roles/components/role-permission-editor-client";
import { requirePagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsRolesPage() {
  await requirePagePermission("role.read");

  const result = await getRolePermissionEditorDataAction({});

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Peran dan Izin</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{result.message}</p>
        </CardContent>
      </Card>
    );
  }

  return <RolePermissionEditorClient data={result.data} />;
}
