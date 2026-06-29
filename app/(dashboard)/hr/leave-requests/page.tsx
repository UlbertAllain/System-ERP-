import { LeaveRequestManagementClient } from "@/features/hr/components/leave-request-management-client";
import { listLeaveRequestsAction } from "@/features/hr/actions";
import { requireAuthenticatedPage } from "@/lib/permissions/page-guard";
import type { PermissionSlug } from "@/constants/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const leaveReadPermissions = [
  "leave.read",
  "leave.read_all",
  "leave.read_own",
] as const satisfies readonly PermissionSlug[];

export default async function LeaveRequestsPage() {
  const currentUser = await requireAuthenticatedPage();

  const hasLeaveAccess = leaveReadPermissions.some((permission) =>
    currentUser.permissions.includes(permission),
  );

  if (!hasLeaveAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Request Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Akun sir tidak memiliki permission untuk membaca leave request.
        </CardContent>
      </Card>
    );
  }

  const result = await listLeaveRequestsAction({});

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Request Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {result.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <LeaveRequestManagementClient
      currentUser={currentUser}
      leaveRequests={result.data}
    />
  );
}
