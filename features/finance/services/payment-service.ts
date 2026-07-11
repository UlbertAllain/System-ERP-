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
import type { PaginatedResult } from "@/types/common";
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
  method?: PaymentMethod;
  status?: PaymentStatus;
};

type ListPaymentsPaginatedParams = ListPaymentsParams & {
  search?: string;
  page: number;
  pageSize: number;
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

function normalizeSearchText(...values: Array<string | null | undefined>): string {
  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim()
    .toLowerCase();
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

export async function listPaymentsService({
  invoiceId,
  clientId,
  projectId,
  method,
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
  } else if (method) {
    querySnap = await baseQuery.where("method", "==", method).get();
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
      if (method && payment.method !== method) return false;
      if (status && payment.status !== status) return false;

      return true;
    })
    .sort((a, b) => {
      const aTime = a.paymentDate?.getTime() ?? 0;
      const bTime = b.paymentDate?.getTime() ?? 0;

      return bTime - aTime;
    });
}

export async function listPaymentsPaginatedService({
  search,
  invoiceId,
  clientId,
  projectId,
  method,
  status,
  page,
  pageSize,
}: ListPaymentsPaginatedParams): Promise<PaginatedResult<PaymentListItem>> {
  const normalizedSearch = search?.trim().toLowerCase();
  const collection = getDb().collection(COLLECTIONS.payments);
  const offset = (page - 1) * pageSize;

  if (normalizedSearch) {
    const querySnap = await collection
      .orderBy("searchText")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .get();

    const matchedPayments = querySnap.docs
      .map((doc) => normalizePaymentDocument(doc.id, doc.data()))
      .filter((payment) => payment.deletedAt === null)
      .filter((payment) => {
        if (invoiceId && payment.invoiceId !== invoiceId) return false;
        if (clientId && payment.clientId !== clientId) return false;
        if (projectId && payment.projectId !== projectId) return false;
        if (method && payment.method !== method) return false;
        if (status && payment.status !== status) return false;

        return true;
      });
    const totalItems = matchedPayments.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items: matchedPayments.slice(offset, offset + pageSize),
      totalItems,
      page,
      pageSize,
      totalPages,
    };
  }

  let baseQuery: FirebaseFirestore.Query = collection.where(
    "deletedAt",
    "==",
    null,
  );

  if (invoiceId) {
    baseQuery = baseQuery.where("invoiceId", "==", invoiceId);
  }

  if (clientId) {
    baseQuery = baseQuery.where("clientId", "==", clientId);
  }

  if (projectId) {
    baseQuery = baseQuery.where("projectId", "==", projectId);
  }

  if (method) {
    baseQuery = baseQuery.where("method", "==", method);
  }

  if (status) {
    baseQuery = baseQuery.where("status", "==", status);
  }

  const countSnap = await baseQuery.count().get();
  const totalItems = countSnap.data().count;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const querySnap = await baseQuery
    .orderBy("paymentDate", "desc")
    .offset(offset)
    .limit(pageSize)
    .get();

  return {
    items: querySnap.docs.map((doc) =>
      normalizePaymentDocument(doc.id, doc.data()),
    ),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
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
  if (amount <= 0) {
    throw new AppError(
      "Amount harus lebih dari 0.",
      400,
      "INVALID_PAYMENT_AMOUNT",
    );
  }

  const db = getDb();
  const invoiceRef = db.collection(COLLECTIONS.invoices).doc(invoiceId);
  const paymentId = createDocumentId("payments");
  const paymentRef = db.collection(COLLECTIONS.payments).doc(paymentId);

  const auditData = await db.runTransaction(async (transaction) => {
    const invoiceSnap = await transaction.get(invoiceRef);

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

    const confirmedPaymentsSnap = await transaction.get(
      db
        .collection(COLLECTIONS.payments)
        .where("invoiceId", "==", invoice.id)
        .where("status", "==", "CONFIRMED"),
    );

    const currentPaidAmount = confirmedPaymentsSnap.docs
      .map((doc) => normalizePaymentDocument(doc.id, doc.data()))
      .filter((payment) => payment.deletedAt === null)
      .reduce((total, payment) => total + payment.amount, 0);

    const nextPaidAmount = currentPaidAmount + amount;

    if (nextPaidAmount > invoice.totalAmount) {
      throw new AppError(
        "Payment melebihi sisa tagihan invoice.",
        400,
        "PAYMENT_EXCEEDS_REMAINING_AMOUNT",
      );
    }

    const remainingAmount = invoice.totalAmount - nextPaidAmount;
    const nextStatus =
      nextPaidAmount >= invoice.totalAmount && invoice.totalAmount > 0
        ? "PAID"
        : invoice.status === "PAID"
          ? "ISSUED"
          : invoice.status;

    transaction.set(paymentRef, {
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
      searchText: normalizeSearchText(
        invoice.invoiceNumber,
        invoice.clientName,
        invoice.clientCompany,
        invoice.projectName,
        invoice.projectCode,
        method,
        normalizeNullableString(referenceNumber),
      ),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });

    transaction.update(invoiceRef, {
      paidAmount: nextPaidAmount,
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

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      nextPaidAmount,
    };
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
      invoiceId: auditData.invoiceId,
      invoiceNumber: auditData.invoiceNumber,
      amount,
      method,
      nextPaidAmount: auditData.nextPaidAmount,
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
  if (amount <= 0) {
    throw new AppError(
      "Amount harus lebih dari 0.",
      400,
      "INVALID_PAYMENT_AMOUNT",
    );
  }

  const db = getDb();
  const paymentRef = db.collection(COLLECTIONS.payments).doc(id);

  const auditData = await db.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);

    if (!paymentSnap.exists) {
      throw new AppError("Payment tidak ditemukan.", 404, "PAYMENT_NOT_FOUND");
    }

    const oldPayment = normalizePaymentDocument(
      paymentSnap.id,
      paymentSnap.data() ?? {},
    );

    if (oldPayment.deletedAt) {
      throw new AppError("Payment sudah dihapus.", 404, "PAYMENT_DELETED");
    }

    if (oldPayment.status === "CANCELLED") {
      throw new AppError(
        "Payment CANCELLED tidak bisa diperbarui.",
        400,
        "PAYMENT_CANCELLED_LOCKED",
      );
    }

    const invoiceRef = db
      .collection(COLLECTIONS.invoices)
      .doc(oldPayment.invoiceId);
    const invoiceSnap = await transaction.get(invoiceRef);

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

    const confirmedPaymentsSnap = await transaction.get(
      db
        .collection(COLLECTIONS.payments)
        .where("invoiceId", "==", invoice.id)
        .where("status", "==", "CONFIRMED"),
    );

    const paidWithoutCurrentPayment = confirmedPaymentsSnap.docs
      .map((doc) => normalizePaymentDocument(doc.id, doc.data()))
      .filter((payment) => payment.deletedAt === null)
      .filter((payment) => payment.id !== oldPayment?.id)
      .reduce((total, payment) => total + payment.amount, 0);

    const nextPaidAmount = paidWithoutCurrentPayment + amount;

    if (nextPaidAmount > invoice.totalAmount) {
      throw new AppError(
        "Payment melebihi total invoice.",
        400,
        "PAYMENT_EXCEEDS_INVOICE_TOTAL",
      );
    }

    const remainingAmount = invoice.totalAmount - nextPaidAmount;
    const nextStatus =
      nextPaidAmount >= invoice.totalAmount && invoice.totalAmount > 0
        ? "PAID"
        : invoice.status === "PAID"
          ? "ISSUED"
          : invoice.status;

    transaction.update(paymentRef, {
      amount,
      paymentDate: dateStringToTimestamp(paymentDate),
      method,
      referenceNumber: normalizeNullableString(referenceNumber),
      notes: normalizeNullableString(notes),
      searchText: normalizeSearchText(
        oldPayment.invoiceNumber,
        oldPayment.clientName,
        oldPayment.clientCompany,
        oldPayment.projectName,
        oldPayment.projectCode,
        method,
        normalizeNullableString(referenceNumber),
      ),
      updatedAt: serverTimestamp(),
    });

    transaction.update(invoiceRef, {
      paidAmount: nextPaidAmount,
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

    return {
      oldPayment,
      nextPaidAmount,
    };
  });

  await writeAuditLog({
    user: actor,
    action: "PAYMENT_UPDATED",
    module: "payment",
    entityId: id,
    entityType: "payment",
    oldValue: {
      amount: auditData.oldPayment.amount,
      method: auditData.oldPayment.method,
      referenceNumber: auditData.oldPayment.referenceNumber,
    },
    newValue: {
      amount,
      method,
      referenceNumber: normalizeNullableString(referenceNumber),
      nextPaidAmount: auditData.nextPaidAmount,
    },
  });

  return getPaymentByIdService(id);
}

export async function cancelPaymentService({
  actor,
  id,
}: PaymentIdParams): Promise<PaymentDetail> {
  const db = getDb();
  const paymentRef = db.collection(COLLECTIONS.payments).doc(id);

  const auditData = await db.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);

    if (!paymentSnap.exists) {
      throw new AppError("Payment tidak ditemukan.", 404, "PAYMENT_NOT_FOUND");
    }

    const oldPayment = normalizePaymentDocument(
      paymentSnap.id,
      paymentSnap.data() ?? {},
    );

    if (oldPayment.deletedAt) {
      throw new AppError("Payment sudah dihapus.", 404, "PAYMENT_DELETED");
    }

    if (oldPayment.status === "CANCELLED") {
      return {
        oldPayment,
        nextPaidAmount: oldPayment.amount,
        changed: false,
      };
    }

    const invoiceRef = db
      .collection(COLLECTIONS.invoices)
      .doc(oldPayment.invoiceId);
    const invoiceSnap = await transaction.get(invoiceRef);

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

    const confirmedPaymentsSnap = await transaction.get(
      db
        .collection(COLLECTIONS.payments)
        .where("invoiceId", "==", oldPayment.invoiceId)
        .where("status", "==", "CONFIRMED"),
    );

    const nextPaidAmount = confirmedPaymentsSnap.docs
      .map((doc) => normalizePaymentDocument(doc.id, doc.data()))
      .filter((payment) => payment.deletedAt === null)
      .filter((payment) => payment.id !== oldPayment?.id)
      .reduce((total, payment) => total + payment.amount, 0);

    const remainingAmount = invoice.totalAmount - nextPaidAmount;
    const nextStatus =
      nextPaidAmount >= invoice.totalAmount && invoice.totalAmount > 0
        ? "PAID"
        : invoice.status === "PAID"
          ? "ISSUED"
          : invoice.status;

    transaction.update(paymentRef, {
      status: "CANCELLED",
      updatedAt: serverTimestamp(),
    });

    transaction.update(invoiceRef, {
      paidAmount: nextPaidAmount,
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

    return {
      oldPayment,
      nextPaidAmount,
      changed: true,
    };
  });

  if (!auditData.changed) {
    return auditData.oldPayment;
  }

  await writeAuditLog({
    user: actor,
    action: "PAYMENT_CANCELLED",
    module: "payment",
    entityId: id,
    entityType: "payment",
    oldValue: {
      status: auditData.oldPayment.status,
      amount: auditData.oldPayment.amount,
    },
    newValue: {
      status: "CANCELLED",
      nextPaidAmount: auditData.nextPaidAmount,
    },
  });

  return getPaymentByIdService(id);
}

export async function deletePaymentService({
  actor,
  id,
}: PaymentIdParams): Promise<PaymentDetail> {
  const db = getDb();
  const paymentRef = db.collection(COLLECTIONS.payments).doc(id);

  const auditData = await db.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);

    if (!paymentSnap.exists) {
      throw new AppError("Payment tidak ditemukan.", 404, "PAYMENT_NOT_FOUND");
    }

    const oldPayment = normalizePaymentDocument(
      paymentSnap.id,
      paymentSnap.data() ?? {},
    );

    if (oldPayment.deletedAt) {
      throw new AppError("Payment sudah dihapus.", 404, "PAYMENT_DELETED");
    }

    const invoiceRef = db
      .collection(COLLECTIONS.invoices)
      .doc(oldPayment.invoiceId);
    const invoiceSnap = await transaction.get(invoiceRef);

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

    const confirmedPaymentsSnap = await transaction.get(
      db
        .collection(COLLECTIONS.payments)
        .where("invoiceId", "==", oldPayment.invoiceId)
        .where("status", "==", "CONFIRMED"),
    );

    const nextPaidAmount = confirmedPaymentsSnap.docs
      .map((doc) => normalizePaymentDocument(doc.id, doc.data()))
      .filter((payment) => payment.deletedAt === null)
      .filter((payment) => payment.id !== oldPayment?.id)
      .reduce((total, payment) => total + payment.amount, 0);

    const remainingAmount = invoice.totalAmount - nextPaidAmount;
    const nextStatus =
      nextPaidAmount >= invoice.totalAmount && invoice.totalAmount > 0
        ? "PAID"
        : invoice.status === "PAID"
          ? "ISSUED"
          : invoice.status;

    transaction.update(paymentRef, {
      status: "CANCELLED",
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(invoiceRef, {
      paidAmount: nextPaidAmount,
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

    return {
      oldPayment,
      nextPaidAmount,
    };
  });

  await writeAuditLog({
    user: actor,
    action: "PAYMENT_DELETED",
    module: "payment",
    entityId: id,
    entityType: "payment",
    oldValue: {
      status: auditData.oldPayment.status,
      amount: auditData.oldPayment.amount,
      deletedAt: auditData.oldPayment.deletedAt,
    },
    newValue: {
      status: "CANCELLED",
      deletedAt: "SERVER_TIMESTAMP",
      nextPaidAmount: auditData.nextPaidAmount,
    },
  });

  return {
    ...auditData.oldPayment,
    status: "CANCELLED",
    deletedAt: new Date(),
  };
}
