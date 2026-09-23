import "server-only";

import { getHrDashboardReadModel } from "@/modules/hr/repositories/hr-dashboard-repository";
import type { HrDashboardSummary } from "@/types/hr-dashboard";

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getHrDashboardSummaryService(): Promise<HrDashboardSummary> {
  const readModel = await getHrDashboardReadModel(getTodayDateString());

  const todayClockedIn = readModel.todayAttendanceRecords.filter(
    (attendance) => attendance.clockInAt !== null,
  ).length;

  return {
    activeEmployees: readModel.activeEmployees,
    pendingLeaveRequests: readModel.pendingLeaveRequests,
    todayAttendanceRecords: readModel.todayAttendanceRecords.length,
    todayClockedIn,
    todayNotClockedIn: Math.max(
      readModel.activeEmployees - todayClockedIn,
      0,
    ),
    recentLeaveRequests: readModel.recentLeaveRequests,
    recentAttendanceRecords: readModel.recentAttendanceRecords,
  };
}
