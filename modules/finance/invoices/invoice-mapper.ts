import type { DocumentData } from "firebase-admin/firestore";

import { timestampToDate } from "@/lib/domain/firestore-value";
import type {
  InvoiceDetail,
  InvoiceLineItem,
  InvoiceListItem,
  InvoiceStatus,
} from "@/types/invoice";

export function normalizeInvoiceDocument(
  id: string,
  data: DocumentData,
): InvoiceDetail {
  return {
    id,
    invoiceNumber: String(data.invoiceNumber ?? ""),
    clientId: String(data.clientId ?? ""),
    clientName: String(data.clientName ?? ""),
    clientCompany: data.clientCompany ?? null,
    projectId: data.projectId ?? null,
    projectName: data.projectName ?? null,
    projectCode: data.projectCode ?? null,
    status: data.status as InvoiceStatus,
    issueDate: timestampToDate(data.issueDate),
    dueDate: timestampToDate(data.dueDate),
    paidAt: timestampToDate(data.paidAt),
    subtotal: Number(data.subtotal ?? 0),
    discountAmount: Number(data.discountAmount ?? 0),
    taxAmount: Number(data.taxAmount ?? 0),
    totalAmount: Number(data.totalAmount ?? 0),
    paidAmount: Number(data.paidAmount ?? 0),
    remainingAmount: Number(data.remainingAmount ?? 0),
    notes: data.notes ?? null,
    lineItems: (data.lineItems ?? []) as InvoiceLineItem[],
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

export function toInvoiceListItem(invoice: InvoiceDetail): InvoiceListItem {
  const { lineItems, ...listItem } = invoice;

  void lineItems;

  return listItem;
}
