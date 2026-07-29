import { AttendanceManagementClient } from "@/features/hr/components/attendance-management-client";
import { listAttendanceRecordsAction } from "@/features/hr/actions";
import { requireAuthenticatedPage } from "@/lib/permissions/page-guard";
import type { PermissionSlug } from "@/constants/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const attendanceReadPermissions = [
  "attendance.read",
  "attendance.read_all",
  "attendance.read_own",
] as const satisfies readonly PermissionSlug[];

export default async function AttendancePage() {
  const currentUser = await requireAuthenticatedPage();

  const hasAttendanceAccess = attendanceReadPermissions.some((permission) =>
    currentUser.permissions.includes(permission),
  );

  if (!hasAttendanceAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Akses Kehadiran Ditolak</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Akun ini tidak memiliki hak akses untuk melihat data kehadiran.
        </CardContent>
      </Card>
    );
  }

  const result = await listAttendanceRecordsAction({});

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Kehadiran</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {result.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <AttendanceManagementClient
      currentUser={currentUser}
      attendanceRecords={result.data}
    />
  );
}
