export type MilestoneStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export type MilestoneListItem = {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  order: number;
  startDate: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type MilestoneDetail = MilestoneListItem;
