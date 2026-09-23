import { TaskManagementClient } from "@/modules/projects/components/task-management-client";
import {
  listMilestonesAction,
  listProjectMembersAction,
  listProjectsAction,
  listTasksPaginatedAction,
} from "@/modules/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskPriority, TaskStatus } from "@/types/task";
import { getProjectWorkspaceAccess } from "@/modules/projects/project-workspace-access";

type TasksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const currentUser = await requireAnyPagePermission([
    "task.read",
    "task.read_all",
    "task.read_assigned",
  ]);

  const params = (await searchParams) ?? {};
  const canReadProjectMembers = currentUser.permissions.includes(
    "project_member.read",
  );
  const [tasksResult, projectsResult, milestonesResult, membersResult] =
    await Promise.all([
      listTasksPaginatedAction({
        search: getSearchParam(params, "search"),
        projectId: getSearchParam(params, "projectId"),
        status: getSearchParam(params, "status") as TaskStatus | undefined,
        priority: getSearchParam(params, "priority") as
          | TaskPriority
          | undefined,
        page: Number(getSearchParam(params, "page") ?? 1),
        pageSize: Number(getSearchParam(params, "pageSize") ?? 10),
      }),
      listProjectsAction({}),
      listMilestonesAction({}),
      canReadProjectMembers
        ? listProjectMembersAction({})
        : Promise.resolve({
            success: true as const,
            message: "Anggota proyek tidak ditampilkan karena akun ini tidak memiliki izin.",
            data: [],
          }),
    ]);

  if (!tasksResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Tugas</CardTitle>
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
          <CardTitle>Kesalahan Data Proyek</CardTitle>
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
          <CardTitle>Kesalahan Data Tahapan</CardTitle>
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
          <CardTitle>Kesalahan Data Anggota Proyek</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {membersResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <TaskManagementClient
      tasks={tasksResult.data.items}
      workspaceAccess={getProjectWorkspaceAccess(currentUser)}
      projects={projectsResult.data}
      milestones={milestonesResult.data}
      members={membersResult.data}
      pagination={{
        totalItems: tasksResult.data.totalItems,
        page: tasksResult.data.page,
        pageSize: tasksResult.data.pageSize,
        totalPages: tasksResult.data.totalPages,
        search: getSearchParam(params, "search") ?? "",
        projectId: getSearchParam(params, "projectId") ?? "",
        status: getSearchParam(params, "status") ?? "",
        priority: getSearchParam(params, "priority") ?? "",
      }}
      commentPermissions={{
        canRead: currentUser.permissions.includes("task_comment.read"),
        canCreate: currentUser.permissions.includes("task_comment.create"),
        canUpdateOwn: currentUser.permissions.includes("task_comment.update_own"),
        canDeleteOwn: currentUser.permissions.includes("task_comment.delete_own"),
        canDeleteAny: currentUser.permissions.includes("task_comment.delete_any"),
        currentUserId: currentUser.uid,
      }}
    />
  );
}
