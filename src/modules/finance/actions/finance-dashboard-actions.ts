"use server";

import { z } from "zod";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import { getFinanceDashboardSummaryService } from "@/modules/finance/services/finance-dashboard-service";
import type {
  FinanceDashboardDateFilter,
  FinanceDashboardSummary,
} from "@/types/finance-dashboard";

const financeDashboardFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function getFinanceDashboardSummaryAction(
  input: FinanceDashboardDateFilter = {},
): Promise<ActionResponse<FinanceDashboardSummary>> {
  try {
    const payload = financeDashboardFilterSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "finance.dashboard.read");

    const summary = await getFinanceDashboardSummaryService({
      from: payload.from,
      to: payload.to,
    });

    return successResponse("Finance dashboard berhasil dimuat.", summary);
  } catch (error) {
    return handleActionError(error);
  }
}
