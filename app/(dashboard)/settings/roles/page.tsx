import { getRolePermissionEditorDataAction } from "@/features/roles/actions";
import { RolePermissionEditorClient } from "@/features/roles/components/role-permission-editor-client";
import { requirePagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsRolesPage() {
  const currentUser = await requirePagePermission("role.read");

  const result = await getRolePermissionEditorDataAction({});

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Permission Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{result.message}</p>

          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="font-medium">Current User Debug</p>
            <p>Email: {currentUser.email}</p>
            <p>Roles: {currentUser.roleSlugs.join(", ")}</p>
            <p>Permission Count: {currentUser.permissions.length}</p>
            <p>
              Has role.read:{" "}
              {currentUser.permissions.includes("role.read") ? "YES" : "NO"}
            </p>
            <p>
              Has permission.read:{" "}
              {currentUser.permissions.includes("permission.read")
                ? "YES"
                : "NO"}
            </p>
            <p>
              Has role.manage_permission:{" "}
              {currentUser.permissions.includes("role.manage_permission")
                ? "YES"
                : "NO"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <RolePermissionEditorClient data={result.data} />;
}
