import type { ImageAsset } from "@/types/common";

export type ExpenseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PAID";

export type ExpenseCategory =
  | "OPERATIONAL"
  | "SOFTWARE"
  | "HARDWARE"
  | "MARKETING"
  | "TRANSPORT"
  | "MEAL"
  | "SALARY"
  | "TAX"
  | "OTHER";

export type ExpenseListItem = {
  id: string;

  expenseNumber: string;
  title: string;
  description: string | null;

  category: ExpenseCategory;
  status: ExpenseStatus;

  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;

  vendorName: string | null;
  amount: number;
  expenseDate: Date | null;
  paidAt: Date | null;

  receipt: ImageAsset | null;
  notes: string | null;

  createdByUserId: string;
  createdByName: string;
  approvedByUserId: string | null;
  approvedByName: string | null;
  rejectedReason: string | null;

  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type ExpenseDetail = ExpenseListItem;
