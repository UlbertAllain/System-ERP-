import "server-only";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/types/auth";
import type {
  PaymentDetail,
  PaymentListItem,
  PaymentMethod,
  PaymentStatus,
} from "@/types/payment";
import type { InvoiceDetail, InvoiceStatus } from "@/types/invoice";

type CreatePaymentParams = {
  actor: CurrentUser;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
};

type UpdatePaymentParams = {
  actor: CurrentUser;
  id: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
};

type PaymentIdParams = {
  actor: CurrentUser;
  id: string;
};

type ListPaymentsParams = {
  invoiceId?: string;
  clientId?: string;
  projectId?: string;
  status?: PaymentStatus;
};

function timestampToDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  return null;
}

function normalizeNullableString(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function dateStringToTimestamp(value: string): Timestamp {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  return Timestamp.fromDate(date);
}

function normalizePaymentDocument(
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

function normalizeInvoiceDocument(
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
    lineItems: data.lineItems ?? [],

    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

async function getInvoiceDocumentOrThrow(id: string): Promise<InvoiceDetail> {
  const invoiceSnap = await getDb()
    .collection(COLLECTIONS.invoices)
    .doc(id)
    .get();

  if (!invoiceSnap.exists) {
    throw new AppError("Invoice tidak ditemukan.", 404, "INVOICE_NOT_FOUND");
  }

  const invoice = normalizeInvoiceDocument(
    invoiceSnap.id,
    invoiceSnap.data() ?? {},
  );

  if (invoice.deletedAt) {
    throw new AppError("Invoice sudah dihapus.", 404, "INVOICE_DELETED");
  }

  if (invoice.status === "VOID") {
    throw new AppError(
      "Invoice VOID tidak bisa menerima payment.",
      400,
      "INVOICE_VOID_LOCKED",
    );
  }

  return invoice;
}

async function getPaymentDocumentOrThrow(id: string): Promise<PaymentDetail> {
  const paymentSnap = await getDb()
    .collection(COLLECTIONS.payments)
    .doc(id)
    .get();

  if (!paymentSnap.exists) {
    throw new AppError("Payment tidak ditemukan.", 404, "PAYMENT_NOT_FOUND");
  }

  return normalizePaymentDocument(paymentSnap.id, paymentSnap.data() ?? {});
}

async function sumConfirmedPaymentsForInvoice(
  invoiceId: string,
  ignoredPaymentId?: string,
): Promise<number> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.payments)
    .where("invoiceId", "==", invoiceId)
    .where("status", "==", "CONFIRMED")
    .get();

  return querySnap.docs
    .map((doc) => normalizePaymentDocument(doc.id, doc.data()))
    .filter((payment) => payment.deletedAt === null)
    .filter((payment) => payment.id !== ignoredPaymentId)
    .reduce((total, payment) => total + payment.amount, 0);
}

async function syncInvoicePaymentState({
  invoiceId,
  paidAmount,
}: {
  invoiceId: string;
  paidAmount: number;
}): Promise<void> {
  const invoice = await getInvoiceDocumentOrThrow(invoiceId);

  if (paidAmount > invoice.totalAmount) {
    throw new AppError(
      "Total payment tidak boleh lebih besar dari total invoice.",
      400,
      "PAYMENT_EXCEEDS_INVOICE_TOTAL",
    );
  }

  const remainingAmount = invoice.totalAmount - paidAmount;
  const nextStatus =
    paidAmount >= invoice.totalAmount && invoice.totalAmount > 0
      ? "PAID"
      : invoice.status === "PAID"
        ? "ISSUED"
        : invoice.status;

  await getDb()
    .collection(COLLECTIONS.invoices)
    .doc(invoiceId)
    .update({
      paidAmount,
      remainingAmount,
      status: nextStatus,
      paidAt:
        nextStatus === "PAID"
          ? invoice.paidAt
            ? Timestamp.fromDate(invoice.paidAt)
            : serverTimestamp()
          : null,
      updatedAt: serverTimestamp(),
    });
}

export async function listPaymentsService({
  invoiceId,
  clientId,
  projectId,
  status,
}: ListPaymentsParams = {}): Promise<PaymentListItem[]> {
  const baseQuery = getDb().collection(COLLECTIONS.payments);

  let querySnap;

  if (invoiceId) {
    querySnap = await baseQuery.where("invoiceId", "==", invoiceId).get();
  } else if (clientId) {
    querySnap = await baseQuery.where("clientId", "==", clientId).get();
  } else if (projectId) {
    querySnap = await baseQuery.where("projectId", "==", projectId).get();
  } else if (status) {
    querySnap = await baseQuery.where("status", "==", status).get();
  } else {
    querySnap = await baseQuery.get();
  }

  return querySnap.docs
    .map((doc) => normalizePaymentDocument(doc.id, doc.data()))
    .filter((payment) => payment.deletedAt === null)
    .filter((payment) => {
      if (invoiceId && payment.invoiceId !== invoiceId) return false;
      if (clientId && payment.clientId !== clientId) return false;
      if (projectId && payment.projectId !== projectId) return false;
      if (status && payment.status !== status) return false;

      return true;
    })
    .sort((a, b) => {
      const aTime = a.paymentDate?.getTime() ?? 0;
      const bTime = b.paymentDate?.getTime() ?? 0;

      return bTime - aTime;
    });
}

export async function getPaymentByIdService(
  id: string,
): Promise<PaymentDetail> {
  const payment = await getPaymentDocumentOrThrow(id);

  if (payment.deletedAt) {
    throw new AppError("Payment sudah dihapus.", 404, "PAYMENT_DELETED");
  }

  return payment;
}

export async function createPaymentService({
  actor,
  invoiceId,
  amount,
  paymentDate,
  method,
  referenceNumber,
  notes,
}: CreatePaymentParams): Promise<PaymentDetail> {
  const invoice = await getInvoiceDocumentOrThrow(invoiceId);

  if (amount <= 0) {
    throw new AppError(
      "Amount harus lebih dari 0.",
      400,
      "INVALID_PAYMENT_AMOUNT",
    );
  }

  const currentPaidAmount = await sumConfirmedPaymentsForInvoice(invoice.id);
  const nextPaidAmount = currentPaidAmount + amount;

  if (nextPaidAmount > invoice.totalAmount) {
    throw new AppError(
      "Payment melebihi sisa tagihan invoice.",
      400,
      "PAYMENT_EXCEEDS_REMAINING_AMOUNT",
    );
  }

  const paymentId = createDocumentId("payments");

  await getDb()
    .collection(COLLECTIONS.payments)
    .doc(paymentId)
    .set({
      id: paymentId,

      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,

      clientId: invoice.clientId,
      clientName: invoice.clientName,
      clientCompany: invoice.clientCompany,

      projectId: invoice.projectId,
      projectName: invoice.projectName,
      projectCode: invoice.projectCode,

      amount,
      paymentDate: dateStringToTimestamp(paymentDate),
      method,
      status: "CONFIRMED",
      referenceNumber: normalizeNullableString(referenceNumber),
      notes: normalizeNullableString(notes),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });

  await syncInvoicePaymentState({
    invoiceId: invoice.id,
    paidAmount: nextPaidAmount,
  });

  await writeAuditLog({
    user: actor,
    action: "PAYMENT_CREATED",
    module: "payment",
    entityId: paymentId,
    entityType: "payment",
    oldValue: null,
    newValue: {
      id: paymentId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount,
      method,
      nextPaidAmount,
    },
  });

  return getPaymentByIdService(paymentId);
}

export async function updatePaymentService({
  actor,
  id,
  amount,
  paymentDate,
  method,
  referenceNumber,
  notes,
}: UpdatePaymentParams): Promise<PaymentDetail> {
  const oldPayment = await getPaymentByIdService(id);

  if (oldPayment.status === "CANCELLED") {
    throw new AppError(
      "Payment CANCELLED tidak bisa diperbarui.",
      400,
      "PAYMENT_CANCELLED_LOCKED",
    );
  }

  const invoice = await getInvoiceDocumentOrThrow(oldPayment.invoiceId);

  if (amount <= 0) {
    throw new AppError(
      "Amount harus lebih dari 0.",
      400,
      "INVALID_PAYMENT_AMOUNT",
    );
  }

  const paidWithoutCurrentPayment = await sumConfirmedPaymentsForInvoice(
    invoice.id,
    oldPayment.id,
  );
  const nextPaidAmount = paidWithoutCurrentPayment + amount;

  if (nextPaidAmount > invoice.totalAmount) {
    throw new AppError(
      "Payment melebihi total invoice.",
      400,
      "PAYMENT_EXCEEDS_INVOICE_TOTAL",
    );
  }

  await getDb()
    .collection(COLLECTIONS.payments)
    .doc(id)
    .update({
      amount,
      paymentDate: dateStringToTimestamp(paymentDate),
      method,
      referenceNumber: normalizeNullableString(referenceNumber),
      notes: normalizeNullableString(notes),
      updatedAt: serverTimestamp(),
    });

  await syncInvoicePaymentState({
    invoiceId: invoice.id,
    paidAmount: nextPaidAmount,
  });

  await writeAuditLog({
    user: actor,
    action: "PAYMENT_UPDATED",
    module: "payment",
    entityId: id,
    entityType: "payment",
    oldValue: {
      amount: oldPayment.amount,
      method: oldPayment.method,
      referenceNumber: oldPayment.referenceNumber,
    },
    newValue: {
      amount,
      method,
      referenceNumber: normalizeNullableString(referenceNumber),
      nextPaidAmount,
    },
  });

  return getPaymentByIdService(id);
}

export async function cancelPaymentService({
  actor,
  id,
}: PaymentIdParams): Promise<PaymentDetail> {
  const oldPayment = await getPaymentByIdService(id);

  if (oldPayment.status === "CANCELLED") {
    return oldPayment;
  }

  await getDb().collection(COLLECTIONS.payments).doc(id).update({
    status: "CANCELLED",
    updatedAt: serverTimestamp(),
  });

  const nextPaidAmount = await sumConfirmedPaymentsForInvoice(
    oldPayment.invoiceId,
    oldPayment.id,
  );

  await syncInvoicePaymentState({
    invoiceId: oldPayment.invoiceId,
    paidAmount: nextPaidAmount,
  });

  await writeAuditLog({
    user: actor,
    action: "PAYMENT_CANCELLED",
    module: "payment",
    entityId: id,
    entityType: "payment",
    oldValue: {
      status: oldPayment.status,
      amount: oldPayment.amount,
    },
    newValue: {
      status: "CANCELLED",
      nextPaidAmount,
    },
  });

  return getPaymentByIdService(id);
}

export async function deletePaymentService({
  actor,
  id,
}: PaymentIdParams): Promise<PaymentDetail> {
  const oldPayment = await getPaymentByIdService(id);

  await getDb().collection(COLLECTIONS.payments).doc(id).update({
    status: "CANCELLED",
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const nextPaidAmount = await sumConfirmedPaymentsForInvoice(
    oldPayment.invoiceId,
    oldPayment.id,
  );

  await syncInvoicePaymentState({
    invoiceId: oldPayment.invoiceId,
    paidAmount: nextPaidAmount,
  });

  await writeAuditLog({
    user: actor,
    action: "PAYMENT_DELETED",
    module: "payment",
    entityId: id,
    entityType: "payment",
    oldValue: {
      status: oldPayment.status,
      amount: oldPayment.amount,
      deletedAt: oldPayment.deletedAt,
    },
    newValue: {
      status: "CANCELLED",
      deletedAt: "SERVER_TIMESTAMP",
      nextPaidAmount,
    },
  });

  return {
    ...oldPayment,
    status: "CANCELLED",
    deletedAt: new Date(),
  };
}
