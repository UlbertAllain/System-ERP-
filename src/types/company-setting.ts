import type { ImageAsset } from "@/types/common";

export type CompanySetting = {
  id: string;

  companyName: string;
  legalName: string | null;
  brandName: string | null;

  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;

  taxNumber: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;

  invoicePrefix: string;
  expensePrefix: string;

  currency: string;
  timezone: string;

  logo: ImageAsset | null;

  invoiceNotes: string | null;
  paymentInstructions: string | null;

  createdAt: Date | null;
  updatedAt: Date | null;
};
