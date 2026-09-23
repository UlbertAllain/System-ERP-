import { ProjectMemberManagementClient } from "@/features/projects/components/project-member-management-client";
import {
  listProjectMembersAction,
  listProjectsAction,
} from "@/features/projects/actions";
import { listEmployeesAction } from "@/features/employees/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectWorkspaceAccess } from "@/features/projects/project-workspace-access";

export default async function ProjectMembersPage() {
  const currentUser = await requireAnyPagePermission(["project_member.read"]);

  const [membersResult, projectsResult, employeesResult] = await Promise.all([
    listProjectMembersAction({}),
    listProjectsAction({}),
    listEmployeesAction({}),
  ]);

  if (!membersResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Anggota Proyek</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {membersResult.message}
        </CardContent>
      </Card>
    );
  }

  if (!projectsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Proyek</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {projectsResult.message}
        </CardContent>
      </Card>
    );
  }

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

  return (
    <ProjectMemberManagementClient
      members={membersResult.data}
      workspaceAccess={getProjectWorkspaceAccess(currentUser)}
      projects={projectsResult.data}
      employees={employeesResult.data}
    />
  );
}
