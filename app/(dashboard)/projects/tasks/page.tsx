import { TaskManagementClient } from "@/features/projects/components/task-management-client";
import {
  listMilestonesAction,
  listProjectMembersAction,
  listProjectsAction,
  listTasksAction,
} from "@/features/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TasksPage() {
  await requireAnyPagePermission(["task.read"]);

  const [tasksResult, projectsResult, milestonesResult, membersResult] =
    await Promise.all([
      listTasksAction({}),
      listProjectsAction({}),
      listMilestonesAction({}),
      listProjectMembersAction({}),
    ]);

  if (!tasksResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {tasksResult.message}
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

  if (!milestonesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Milestone Data Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {milestonesResult.message}
        </CardContent>
      </Card>
    );
  }

  if (!membersResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Member Data Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {membersResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <TaskManagementClient
      tasks={tasksResult.data}
      projects={projectsResult.data}
      milestones={milestonesResult.data}
      members={membersResult.data}
    />
  );
}
