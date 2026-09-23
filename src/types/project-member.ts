export type ProjectMemberRole =
  | "PROJECT_MANAGER"
  | "TECH_LEAD"
  | "DEVELOPER"
  | "DESIGNER"
  | "QA"
  | "BUSINESS_ANALYST"
  | "FINANCE"
  | "OBSERVER";

export type ProjectMemberStatus = "ACTIVE" | "INACTIVE" | "REMOVED";

export type ProjectMemberListItem = {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  employeeId: string;
  employeeName: string;
  userId: string | null;
  role: ProjectMemberRole;
  status: ProjectMemberStatus;
  joinedAt: Date | null;
  leftAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type ProjectMemberDetail = ProjectMemberListItem;
