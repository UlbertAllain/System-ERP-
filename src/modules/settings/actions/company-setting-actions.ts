"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requireAnyPermission, requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { CompanySetting } from "@/types/company-setting";
import {
  getCompanySettingService,
  updateCompanyLogoService,
  updateCompanySettingService,
} from "@/features/settings/services/company-setting-service";
import {
  updateCompanyLogoSchema,
  updateCompanySettingSchema,
  type UpdateCompanyLogoInput,
  type UpdateCompanySettingInput,
} from "@/features/settings/schemas/company-setting-schema";

function revalidateCompanySettingPaths() {
  revalidatePath("/settings/company");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  revalidatePath("/reports");
  revalidatePath("/invoices");
  revalidatePath("/expenses");
}

export async function getCompanySettingAction(): Promise<
  ActionResponse<CompanySetting>
> {
  try {
    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "setting.system.read",
      "setting.company.read",
    ]);

    const setting = await getCompanySettingService();

    return successResponse("Company setting berhasil dimuat.", setting);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateCompanySettingAction(
  input: UpdateCompanySettingInput,
): Promise<ActionResponse<CompanySetting>> {
  try {
    const payload = updateCompanySettingSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "setting.company.update");

    const setting = await updateCompanySettingService({
      actor: auth.user,
      ...payload,
    });

    revalidateCompanySettingPaths();

    return successResponse("Company setting berhasil diperbarui.", setting);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateCompanyLogoAction(
  input: UpdateCompanyLogoInput,
): Promise<ActionResponse<CompanySetting>> {
  try {
    const payload = updateCompanyLogoSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "setting.company.update");

    const setting = await updateCompanyLogoService({
      actor: auth.user,
      logo: {
        url: payload.url,
        publicId: payload.publicId,
      },
    });

    revalidateCompanySettingPaths();

    return successResponse("Company logo berhasil diperbarui.", setting);
  } catch (error) {
    return handleActionError(error);
  }
}
