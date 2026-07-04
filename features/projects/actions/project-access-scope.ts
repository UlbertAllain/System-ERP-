import "server-only";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import type { CurrentUser } from "@/types/auth";
import type { ProjectListItem } from "@/types/project";
import type { ProjectMemberListItem } from "@/types/project-member";
import type { MilestoneListItem } from "@/types/milestone";
import type { TaskListItem } from "@/types/task";

export async function getAssignedProjectIdsForUser(
  user: CurrentUser,
): Promise<Set<string>> {
  const projectIds = new Set<string>();

  const [picProjectsSnap, memberProjectsSnap] = await Promise.all([
    getDb()
      .collection(COLLECTIONS.projects)
      .where("picUserId", "==", user.uid)
      .get(),
    getDb()
      .collection(COLLECTIONS.projectMembers)
      .where("userId", "==", user.uid)
      .where("status", "==", "ACTIVE")
      .get(),
  ]);

  picProjectsSnap.docs.forEach((doc) => {
    const data = doc.data();

    if (!data.deletedAt) {
      projectIds.add(doc.id);
    }
  });

  memberProjectsSnap.docs.forEach((doc) => {
    const projectId = doc.data().projectId;

    if (typeof projectId === "string" && projectId) {
      projectIds.add(projectId);
    }
  });

  return projectIds;
}

export function userHasOnlyAssignedProjectRead(user: CurrentUser): boolean {
  return (
    user.permissions.includes("project.read_assigned") &&
    !user.permissions.includes("project.read") &&
    !user.permissions.includes("project.read_all")
  );
}

export function userHasGlobalProjectRead(user: CurrentUser): boolean {
  return (
    user.permissions.includes("project.read") ||
    user.permissions.includes("project.read_all")
  );
}

export function userHasOnlyAssignedMilestoneRead(user: CurrentUser): boolean {
  return (
    user.permissions.includes("milestone.read_assigned") &&
    !user.permissions.includes("milestone.read")
  );
}

export function userHasOnlyAssignedTaskRead(user: CurrentUser): boolean {
  return (
    user.permissions.includes("task.read_assigned") &&
    !user.permissions.includes("task.read") &&
    !user.permissions.includes("task.read_all")
  );
}

export async function filterProjectsForUser(
  user: CurrentUser,
  projects: ProjectListItem[],
): Promise<ProjectListItem[]> {
  if (!userHasOnlyAssignedProjectRead(user)) {
    return projects;
  }

  const assignedProjectIds = await getAssignedProjectIdsForUser(user);

  return projects.filter((project) => assignedProjectIds.has(project.id));
}

export async function canAccessProject(
  user: CurrentUser,
  projectId: string,
): Promise<boolean> {
  if (userHasGlobalProjectRead(user)) {
    return true;
  }

  if (!user.permissions.includes("project.read_assigned")) {
    return false;
  }

  const assignedProjectIds = await getAssignedProjectIdsForUser(user);

  return assignedProjectIds.has(projectId);
}

export async function canAccessProjectForMutation(
  user: CurrentUser,
  projectId: string,
): Promise<boolean> {
  if (userHasGlobalProjectRead(user)) {
    return true;
  }

  if (!user.permissions.includes("project.read_assigned")) {
    return false;
  }

  return canAccessProject(user, projectId);
}

export async function filterProjectMembersForUser(
  user: CurrentUser,
  members: ProjectMemberListItem[],
): Promise<ProjectMemberListItem[]> {
  if (!userHasOnlyAssignedProjectRead(user)) {
    return members;
  }

  const assignedProjectIds = await getAssignedProjectIdsForUser(user);

  return members.filter((member) => assignedProjectIds.has(member.projectId));
}

export async function canAccessProjectMember(
  user: CurrentUser,
  member: ProjectMemberListItem,
): Promise<boolean> {
  return canAccessProject(user, member.projectId);
}

export async function filterMilestonesForUser(
  user: CurrentUser,
  milestones: MilestoneListItem[],
): Promise<MilestoneListItem[]> {
  if (!userHasOnlyAssignedMilestoneRead(user)) {
    return milestones;
  }

  const assignedProjectIds = await getAssignedProjectIdsForUser(user);

  return milestones.filter((milestone) =>
    assignedProjectIds.has(milestone.projectId),
  );
}

export async function canAccessMilestone(
  user: CurrentUser,
  milestone: MilestoneListItem,
): Promise<boolean> {
  if (user.permissions.includes("milestone.read")) {
    return true;
  }

  if (!user.permissions.includes("milestone.read_assigned")) {
    return false;
  }

  const assignedProjectIds = await getAssignedProjectIdsForUser(user);

  return assignedProjectIds.has(milestone.projectId);
}

export async function filterTasksForUser(
  user: CurrentUser,
  tasks: TaskListItem[],
): Promise<TaskListItem[]> {
  if (!userHasOnlyAssignedTaskRead(user)) {
    return tasks;
  }

  const assignedProjectIds = await getAssignedProjectIdsForUser(user);

  return tasks.filter(
    (task) =>
      task.assigneeUserId === user.uid || assignedProjectIds.has(task.projectId),
  );
}

export async function canAccessTask(
  user: CurrentUser,
  task: TaskListItem,
): Promise<boolean> {
  if (
    user.permissions.includes("task.read") ||
    user.permissions.includes("task.read_all")
  ) {
    return true;
  }

  if (!user.permissions.includes("task.read_assigned")) {
    return false;
  }

  const assignedProjectIds = await getAssignedProjectIdsForUser(user);

  return task.assigneeUserId === user.uid || assignedProjectIds.has(task.projectId);
}
