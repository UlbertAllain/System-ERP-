import { ProjectManagementClient } from "@/features/projects/components/project-management-client";
import { listProjectsAction } from "@/features/projects/actions";
import { listClientsAction } from "@/features/clients/actions";
import { listEmployeesAction } from "@/features/employees/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProjectsPage() {
  await requireAnyPagePermission(["project.read", "project.read_all"]);

  const [projectsResult, clientsResult, employeesResult] = await Promise.all([
    listProjectsAction({}),
    listClientsAction({}),
    listEmployeesAction({}),
  ]);

  if (!projectsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {projectsResult.message}
        </CardContent>
      </Card>
    );
  }

  if (!clientsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Data Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {clientsResult.message}
        </CardContent>
      </Card>
    );
  }

  if (!employeesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee Data Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {employeesResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <ProjectManagementClient
      projects={projectsResult.data}
      clients={clientsResult.data}
      employees={employeesResult.data}
    />
  );
}
