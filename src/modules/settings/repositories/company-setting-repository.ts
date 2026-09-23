import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";
import type { CompanySetting } from "@/types/company-setting";

export const COMPANY_SETTING_ID = "company";

export function normalizeCompanySettingDocument(
  id: string,
  data: DocumentData,
): CompanySetting {
  return {
    id,
    companyName: String(data.companyName ?? "Perusahaan"),
    legalName: data.legalName ?? null,
    brandName: data.brandName ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    website: data.website ?? null,
    address: data.address ?? null,
    taxNumber: data.taxNumber ?? null,
    bankName: data.bankName ?? null,
    bankAccountName: data.bankAccountName ?? null,
    bankAccountNumber: data.bankAccountNumber ?? null,
    invoicePrefix: String(data.invoicePrefix ?? "INV"),
    expensePrefix: String(data.expensePrefix ?? "EXP"),
    currency: String(data.currency ?? "IDR"),
    timezone: String(data.timezone ?? "Asia/Jakarta"),
    logo: data.logo ?? null,
    invoiceNotes: data.invoiceNotes ?? null,
    paymentInstructions: data.paymentInstructions ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function getDefaultCompanySetting(): CompanySetting {
  return {
    id: COMPANY_SETTING_ID,
    companyName: "Perusahaan",
    legalName: null,
    brandName: "Perusahaan",
    email: null,
    phone: null,
    website: null,
    address: null,
    taxNumber: null,
    bankName: null,
    bankAccountName: null,
    bankAccountNumber: null,
    invoicePrefix: "INV",
    expensePrefix: "EXP",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    logo: null,
    invoiceNotes: null,
    paymentInstructions: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function getCompanySetting(): Promise<CompanySetting> {
  const snap = await getDb()
    .collection(COLLECTIONS.settings)
    .doc(COMPANY_SETTING_ID)
    .get();

  if (!snap.exists) {
    return getDefaultCompanySetting();
  }

  return normalizeCompanySettingDocument(snap.id, snap.data() ?? {});
}
