export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "BLOCKED"
  | "CANCELLED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskListItem = {
  id: string;

  projectId: string;
  projectName: string;
  projectCode: string;

  milestoneId: string | null;
  milestoneTitle: string | null;

  assigneeEmployeeId: string | null;
  assigneeName: string | null;
  assigneeUserId: string | null;

  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;

  startDate: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;

  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type TaskDetail = TaskListItem;
