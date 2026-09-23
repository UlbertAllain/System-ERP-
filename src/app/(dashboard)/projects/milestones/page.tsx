import { MilestoneManagementClient } from "@/modules/projects/components/milestone-management-client";
import {
  listMilestonesAction,
  listProjectsAction,
} from "@/modules/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectWorkspaceAccess } from "@/modules/projects/project-workspace-access";

export default async function MilestonesPage() {
  const currentUser = await requireAnyPagePermission([
    "milestone.read",
    "milestone.read_assigned",
  ]);

  const [milestonesResult, projectsResult] = await Promise.all([
    listMilestonesAction({}),
    listProjectsAction({}),
  ]);

  if (!milestonesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Tahapan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {milestonesResult.message}
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

  return (
    <MilestoneManagementClient
      milestones={milestonesResult.data}
      workspaceAccess={getProjectWorkspaceAccess(currentUser)}
      projects={projectsResult.data}
    />
  );
}
