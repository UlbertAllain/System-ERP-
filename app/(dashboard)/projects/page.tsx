import { ProjectManagementClient } from "@/features/projects/components/project-management-client";
import { listProjectsPaginatedAction } from "@/features/projects/actions";
import { listClientsAction } from "@/features/clients/actions";
import { listEmployeesAction } from "@/features/employees/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectPriority, ProjectStatus } from "@/types/project";
import { getProjectWorkspaceAccess } from "@/features/projects/project-workspace-access";

type ProjectsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const currentUser = await requireAnyPagePermission([
    "project.read",
    "project.read_all",
    "project.read_assigned",
  ]);

  const params = (await searchParams) ?? {};
  const [projectsResult, clientsResult, employeesResult] = await Promise.all([
    listProjectsPaginatedAction({
      search: getSearchParam(params, "search"),
      status: getSearchParam(params, "status") as ProjectStatus | undefined,
      priority: getSearchParam(params, "priority") as
        | ProjectPriority
        | undefined,
      page: Number(getSearchParam(params, "page") ?? 1),
      pageSize: Number(getSearchParam(params, "pageSize") ?? 10),
    }),
    listClientsAction({}),
    listEmployeesAction({}),
  ]);

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

  if (!clientsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Pelanggan</CardTitle>
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
          <CardTitle>Kesalahan Data Karyawan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {employeesResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <ProjectManagementClient
      projects={projectsResult.data.items}
      workspaceAccess={getProjectWorkspaceAccess(currentUser)}
      clients={clientsResult.data}
      employees={employeesResult.data}
      pagination={{
        totalItems: projectsResult.data.totalItems,
        page: projectsResult.data.page,
        pageSize: projectsResult.data.pageSize,
        totalPages: projectsResult.data.totalPages,
        search: getSearchParam(params, "search") ?? "",
        status: getSearchParam(params, "status") ?? "",
        priority: getSearchParam(params, "priority") ?? "",
      }}
    />
  );
}
