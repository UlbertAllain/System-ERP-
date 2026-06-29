import { MilestoneManagementClient } from "@/features/projects/components/milestone-management-client";
import {
  listMilestonesAction,
  listProjectsAction,
} from "@/features/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MilestonesPage() {
  await requireAnyPagePermission(["milestone.read"]);

  const [milestonesResult, projectsResult] = await Promise.all([
    listMilestonesAction({}),
    listProjectsAction({}),
  ]);

  if (!milestonesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Milestone Error</CardTitle>
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
          <CardTitle>Project Data Error</CardTitle>
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
      projects={projectsResult.data}
    />
  );
}
