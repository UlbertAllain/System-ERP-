import type { CurrentUser } from "@/types/auth";
import type { PermissionSlug } from "@/constants/permissions";
import type { ProjectWorkspaceAccess } from "@/features/projects/components/project-workspace-nav";

function hasAny(user: CurrentUser, permissions: PermissionSlug[]) {
  return (
    user.roleSlugs.includes("super_admin") ||
    permissions.some((permission) => user.permissions.includes(permission))
  );
}

export function getProjectWorkspaceAccess(
  user: CurrentUser,
): ProjectWorkspaceAccess {
  return {
    projects: hasAny(user, [
      "project.read",
      "project.read_all",
      "project.read_assigned",
    ]),
    members: hasAny(user, ["project_member.read"]),
    milestones: hasAny(user, [
      "milestone.read",
      "milestone.read_assigned",
    ]),
    tasks: hasAny(user, ["task.read", "task.read_all", "task.read_assigned"]),
  };
}
