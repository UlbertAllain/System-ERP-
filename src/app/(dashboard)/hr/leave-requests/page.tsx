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
          <CardTitle>Akses Pengajuan Cuti Ditolak</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Akun ini tidak memiliki hak akses untuk melihat pengajuan izin dan cuti.
        </CardContent>
      </Card>
    );
  }

  const result = await listLeaveRequestsAction({});

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Pengajuan Cuti</CardTitle>
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
