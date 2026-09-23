"use server";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requireAnyPermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import { getHrDashboardSummaryService } from "@/modules/hr/services/hr-dashboard-service";
import type { HrDashboardSummary } from "@/types/hr-dashboard";

export async function getHrDashboardSummaryAction(): Promise<
  ActionResponse<HrDashboardSummary>
> {
  try {
    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "hr.dashboard.read",
      "employee.read",
      "employee.read_all",
      "leave.read",
      "leave.read_all",
      "attendance.read",
      "attendance.read_all",
    ]);

    const summary = await getHrDashboardSummaryService();

    return successResponse("HR dashboard berhasil dimuat.", summary);
  } catch (error) {
    return handleActionError(error);
  }
}
