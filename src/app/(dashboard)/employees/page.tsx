import { EmployeeManagementClient } from "@/modules/employees/components/employee-management-client";
import { listEmployeesAction } from "@/modules/employees/actions";
import { listUsersAction } from "@/modules/users/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EmployeesPage() {
  await requireAnyPagePermission([
    "employee.read",
    "employee.read_all",
    "employee.read_own",
  ]);

  const [employeesResult, usersResult] = await Promise.all([
    listEmployeesAction({}),
    listUsersAction({}),
  ]);

  if (!employeesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Karyawan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {employeesResult.message}
        </CardContent>
      </Card>
    );
  }

  if (!usersResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Pengguna</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {usersResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <EmployeeManagementClient
      employees={employeesResult.data}
      users={usersResult.data}
    />
  );
}
