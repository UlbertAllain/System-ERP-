import type { AttendanceRecordListItem } from "@/types/attendance";
import type { LeaveRequestListItem } from "@/types/leave";

export type HrDashboardSummary = {
  activeEmployees: number;
  pendingLeaveRequests: number;
  todayAttendanceRecords: number;
  todayClockedIn: number;
  todayNotClockedIn: number;
  recentLeaveRequests: LeaveRequestListItem[];
  recentAttendanceRecords: AttendanceRecordListItem[];
};
