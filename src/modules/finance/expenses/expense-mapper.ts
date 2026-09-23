import type { DocumentData } from "firebase-admin/firestore";

import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  ExpenseCategory,
  ExpenseDetail,
  ExpenseStatus,
} from "@/types/expense";

export function normalizeExpenseDocument(
  id: string,
  data: DocumentData,
): ExpenseDetail {
  return {
    id,
    expenseNumber: String(data.expenseNumber ?? ""),
    title: String(data.title ?? ""),
    description: data.description ?? null,
    category: data.category as ExpenseCategory,
    status: data.status as ExpenseStatus,
    projectId: data.projectId ?? null,
    projectName: data.projectName ?? null,
    projectCode: data.projectCode ?? null,
    vendorName: data.vendorName ?? null,
    amount: Number(data.amount ?? 0),
    expenseDate: timestampToDate(data.expenseDate),
    paidAt: timestampToDate(data.paidAt),
    receipt: data.receipt ?? null,
    notes: data.notes ?? null,
    createdByUserId: String(data.createdByUserId ?? ""),
    createdByName: String(data.createdByName ?? ""),
    approvedByUserId: data.approvedByUserId ?? null,
    approvedByName: data.approvedByName ?? null,
    rejectedReason: data.rejectedReason ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}
