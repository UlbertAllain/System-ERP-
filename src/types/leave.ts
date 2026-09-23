export type LeaveRequestType =
  | "ANNUAL_LEAVE"
  | "SICK_LEAVE"
  | "PERMISSION"
  | "UNPAID_LEAVE"
  | "OTHER";

export type LeaveRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type LeaveRequestListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  userId: string;
  type: LeaveRequestType;
  startDate: Date | null;
  endDate: Date | null;
  totalDays: number;
  reason: string;
  status: LeaveRequestStatus;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: Date | null;
  rejectedReason: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type LeaveRequestDetail = LeaveRequestListItem;
