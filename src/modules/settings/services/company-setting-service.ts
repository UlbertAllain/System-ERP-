import "server-only";

import { COLLECTIONS, getDb, serverTimestamp } from "@/lib/firebase/firestore";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { deleteCloudinaryImage } from "@/lib/cloudinary/server";
import type { CurrentUser } from "@/types/auth";
import type { ImageAsset } from "@/types/common";
import type { CompanySetting } from "@/types/company-setting";
import {
  COMPANY_SETTING_ID,
  getCompanySetting,
} from "@/features/settings/repositories/company-setting-repository";

type UpdateCompanySettingParams = {
  actor: CurrentUser;
  companyName: string;
  legalName?: string | null;
  brandName?: string | null;

  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;

  taxNumber?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;

  invoicePrefix: string;
  expensePrefix: string;

  currency: string;
  timezone: string;

  invoiceNotes?: string | null;
  paymentInstructions?: string | null;
};

type UpdateCompanyLogoParams = {
  actor: CurrentUser;
  logo: ImageAsset;
};

function normalizeNullableString(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export async function getCompanySettingService(): Promise<CompanySetting> {
  return getCompanySetting();
}

export async function updateCompanySettingService({
  actor,
  companyName,
  legalName,
  brandName,
  email,
  phone,
  website,
  address,
  taxNumber,
  bankName,
  bankAccountName,
  bankAccountNumber,
  invoicePrefix,
  expensePrefix,
  currency,
  timezone,
  invoiceNotes,
  paymentInstructions,
}: UpdateCompanySettingParams): Promise<CompanySetting> {
  const oldSetting = await getCompanySettingService();

  const payload = {
    companyName: companyName.trim(),
    legalName: normalizeNullableString(legalName),
    brandName: normalizeNullableString(brandName),

    email: normalizeNullableString(email),
    phone: normalizeNullableString(phone),
    website: normalizeNullableString(website),
    address: normalizeNullableString(address),

    taxNumber: normalizeNullableString(taxNumber),
    bankName: normalizeNullableString(bankName),
    bankAccountName: normalizeNullableString(bankAccountName),
    bankAccountNumber: normalizeNullableString(bankAccountNumber),

    invoicePrefix: invoicePrefix.trim().toUpperCase(),
    expensePrefix: expensePrefix.trim().toUpperCase(),

    currency: currency.trim().toUpperCase(),
    timezone: timezone.trim(),

    invoiceNotes: normalizeNullableString(invoiceNotes),
    paymentInstructions: normalizeNullableString(paymentInstructions),

    updatedAt: serverTimestamp(),
  };

  const settingRef = getDb()
    .collection(COLLECTIONS.settings)
    .doc(COMPANY_SETTING_ID);

  const settingSnap = await settingRef.get();

  if (settingSnap.exists) {
    await settingRef.update(payload);
  } else {
    await settingRef.set({
      id: COMPANY_SETTING_ID,
      ...payload,
      logo: null,
      createdAt: serverTimestamp(),
    });
  }

  await writeAuditLog({
    user: actor,
    action: "COMPANY_SETTING_UPDATED",
    module: "setting",
    entityId: COMPANY_SETTING_ID,
    entityType: "company_setting",
    oldValue: {
      companyName: oldSetting.companyName,
      legalName: oldSetting.legalName,
      brandName: oldSetting.brandName,
      email: oldSetting.email,
      phone: oldSetting.phone,
      website: oldSetting.website,
      invoicePrefix: oldSetting.invoicePrefix,
      expensePrefix: oldSetting.expensePrefix,
      currency: oldSetting.currency,
      timezone: oldSetting.timezone,
    },
    newValue: {
      companyName: payload.companyName,
      legalName: payload.legalName,
      brandName: payload.brandName,
      email: payload.email,
      phone: payload.phone,
      website: payload.website,
      invoicePrefix: payload.invoicePrefix,
      expensePrefix: payload.expensePrefix,
      currency: payload.currency,
      timezone: payload.timezone,
    },
  });

  return getCompanySettingService();
}

export async function updateCompanyLogoService({
  actor,
  logo,
}: UpdateCompanyLogoParams): Promise<CompanySetting> {
  const oldSetting = await getCompanySettingService();

  await getDb()
    .collection(COLLECTIONS.settings)
    .doc(COMPANY_SETTING_ID)
    .set(
      {
        id: COMPANY_SETTING_ID,
        companyName: oldSetting.companyName,
        invoicePrefix: oldSetting.invoicePrefix,
        expensePrefix: oldSetting.expensePrefix,
        currency: oldSetting.currency,
        timezone: oldSetting.timezone,
        logo,
        updatedAt: serverTimestamp(),
        createdAt: oldSetting.createdAt ?? serverTimestamp(),
      },
      { merge: true },
    );

  if (oldSetting.logo?.publicId && oldSetting.logo.publicId !== logo.publicId) {
    await deleteCloudinaryImage(oldSetting.logo.publicId);
  }

  await writeAuditLog({
    user: actor,
    action: "COMPANY_LOGO_UPDATED",
    module: "setting",
    entityId: COMPANY_SETTING_ID,
    entityType: "company_setting",
    oldValue: {
      logo: oldSetting.logo,
    },
    newValue: {
      logo,
    },
  });

  return getCompanySettingService();
}
