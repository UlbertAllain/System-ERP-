import type { DocumentData } from "firebase-admin/firestore";

import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  PaymentDetail,
  PaymentMethod,
  PaymentStatus,
} from "@/types/payment";

export function normalizePaymentDocument(
  id: string,
  data: DocumentData,
): PaymentDetail {
  return {
    id,
    invoiceId: String(data.invoiceId ?? ""),
    invoiceNumber: String(data.invoiceNumber ?? ""),
    clientId: String(data.clientId ?? ""),
    clientName: String(data.clientName ?? ""),
    clientCompany: data.clientCompany ?? null,
    projectId: data.projectId ?? null,
    projectName: data.projectName ?? null,
    projectCode: data.projectCode ?? null,
    amount: Number(data.amount ?? 0),
    paymentDate: timestampToDate(data.paymentDate),
    method: data.method as PaymentMethod,
    status: data.status as PaymentStatus,
    referenceNumber: data.referenceNumber ?? null,
    notes: data.notes ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}
