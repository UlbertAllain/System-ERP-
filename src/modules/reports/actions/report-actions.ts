"use server";

import { z } from "zod";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import { getReportsDashboardSummaryService } from "@/modules/reports/services/report-service";
import type {
  ReportsDashboardDateFilter,
  ReportsDashboardSummary,
} from "@/types/report";

const reportsDashboardFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function getReportsDashboardSummaryAction(
  input: ReportsDashboardDateFilter = {},
): Promise<ActionResponse<ReportsDashboardSummary>> {
  try {
    const payload = reportsDashboardFilterSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "report.dashboard.read");

    const summary = await getReportsDashboardSummaryService({
      from: payload.from,
      to: payload.to,
    });

    return successResponse("Reports berhasil dimuat.", summary);
  } catch (error) {
    return handleActionError(error);
  }
}
