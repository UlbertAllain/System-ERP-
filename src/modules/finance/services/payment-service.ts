import "server-only";

import { createHash } from "node:crypto";

import { Timestamp } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { getAuditLogDocument } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import {
  addMoney,
  compareMoney,
  normalizeMoney,
  subtractMoney,
} from "@/lib/domain/money";
import type { CurrentUser } from "@/types/auth";
import type { PaginatedResult } from "@/types/common";
import type {
  PaymentDetail,
  PaymentListItem,
  PaymentMethod,
  PaymentStatus,
} from "@/types/payment";
import { deriveInvoicePaymentStatus } from "@/modules/finance/domain/invoice-payment-state";

import {
  normalizeNullableString,
  normalizeSearchText,
  dateStringToTimestamp,
} from "@/lib/domain/firestore-value";
import { normalizeInvoiceDocument } from "@/modules/finance/invoices/invoice-mapper";
import { normalizePaymentDocument } from "@/modules/finance/payments/payment-mapper";
import {
  findPaymentById,
  listPayments,
  listPaymentsPaginated,
} from "@/modules/finance/repositories/payment-repository";

type CreatePaymentParams = {
  actor: CurrentUser;
  idempotencyKey: string;
  invoiceId: string;
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

function createPaymentRequestHash({
  actorUid,
  invoiceId,
  amount,
  paymentDate,
  method,
  referenceNumber,
  notes,
}: Omit<CreatePaymentParams, "actor" | "idempotencyKey"> & {
  actorUid: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        actorUid,
        invoiceId,
        amount,
        paymentDate,
        method,
        referenceNumber: normalizeNullableString(referenceNumber),
        notes: normalizeNullableString(notes),
      }),
    )
    .digest("hex");
}

async function getPaymentDocumentOrThrow(id: string): Promise<PaymentDetail> {
  const payment = await findPaymentById(id);

  if (!payment) {
    throw new AppError("Payment tidak ditemukan.", 404, "PAYMENT_NOT_FOUND");
  }

  return payment;
}

export async function listPaymentsService(
  input: ListPaymentsParams = {},
): Promise<PaymentListItem[]> {
  return listPayments(input);
}

export async function listPaymentsPaginatedService(
  input: ListPaymentsPaginatedParams,
): Promise<PaginatedResult<PaymentListItem>> {
  return listPaymentsPaginated(input);
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
  idempotencyKey,
  invoiceId,
  amount,
  paymentDate,
  method,
  referenceNumber,
  notes,
}: CreatePaymentParams): Promise<PaymentDetail> {
  const normalizedAmount = normalizeMoney(amount);
  const paymentTimestamp = dateStringToTimestamp(paymentDate);

  if (normalizedAmount <= 0) {
    throw new AppError(
      "Nominal pembayaran harus lebih dari 0.",
      400,
      "INVALID_PAYMENT_AMOUNT",
    );
  }

  const db = getDb();
  const invoiceRef = db.collection(COLLECTIONS.invoices).doc(invoiceId);
  const idempotencyRef = db
    .collection(COLLECTIONS.paymentIdempotency)
    .doc(idempotencyKey);
  const requestHash = createPaymentRequestHash({
    actorUid: actor.uid,
    invoiceId,
    amount: normalizedAmount,
    paymentDate,
    method,
    referenceNumber,
    notes,
  });

  const transactionResult = await db.runTransaction(async (transaction) => {
    const idempotencySnap = await transaction.get(idempotencyRef);

    if (idempotencySnap.exists) {
      const idempotencyData = idempotencySnap.data() ?? {};
      const existingPaymentId = String(idempotencyData.paymentId ?? "");

      if (
        String(idempotencyData.requestHash ?? "") !== requestHash ||
        String(idempotencyData.actorUid ?? "") !== actor.uid ||
        String(idempotencyData.invoiceId ?? "") !== invoiceId
      ) {
        throw new AppError(
          "Idempotency key sudah digunakan untuk permintaan pembayaran yang berbeda.",
          409,
          "PAYMENT_IDEMPOTENCY_CONFLICT",
        );
      }

      if (!existingPaymentId) {
        throw new AppError(
          "Data idempotensi pembayaran tidak valid.",
          409,
          "INVALID_PAYMENT_IDEMPOTENCY",
        );
      }

      const existingPaymentRef = db
        .collection(COLLECTIONS.payments)
        .doc(existingPaymentId);
      const existingPaymentSnap = await transaction.get(existingPaymentRef);

      if (!existingPaymentSnap.exists) {
        throw new AppError(
          "Referensi pembayaran sebelumnya tidak ditemukan.",
          409,
          "PAYMENT_IDEMPOTENCY_ORPHANED",
        );
      }

      return { paymentId: existingPaymentId, created: false };
    }

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

    if (invoice.status === "DRAFT") {
      throw new AppError(
        "Invoice harus diterbitkan sebelum menerima pembayaran.",
        409,
        "INVOICE_NOT_ISSUED",
      );
    }

    if (invoice.status === "VOID") {
      throw new AppError(
        "Invoice VOID tidak dapat menerima pembayaran.",
        409,
        "INVOICE_VOID_LOCKED",
      );
    }

    if (invoice.status === "PAID" || invoice.remainingAmount <= 0) {
      throw new AppError(
        "Invoice sudah lunas.",
        409,
        "INVOICE_ALREADY_PAID",
      );
    }

    const nextPaidAmount = addMoney(invoice.paidAmount, normalizedAmount);

    if (compareMoney(nextPaidAmount, invoice.totalAmount) > 0) {
      throw new AppError(
        "Nominal pembayaran melebihi sisa tagihan invoice.",
        409,
        "PAYMENT_EXCEEDS_REMAINING_AMOUNT",
      );
    }

    const paymentId = createDocumentId("payments");
    const paymentRef = db.collection(COLLECTIONS.payments).doc(paymentId);
    const remainingAmount = subtractMoney(invoice.totalAmount, nextPaidAmount);
    const nextStatus = deriveInvoicePaymentStatus(
      invoice.totalAmount,
      nextPaidAmount,
      invoice.status,
    );
    const auditLog = getAuditLogDocument({
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
        amount: normalizedAmount,
        method,
        paidAmount: nextPaidAmount,
        remainingAmount,
      },
    });

    transaction.set(paymentRef, {
      id: paymentId,
      idempotencyKey,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      clientCompany: invoice.clientCompany,
      projectId: invoice.projectId,
      projectName: invoice.projectName,
      projectCode: invoice.projectCode,
      amount: normalizedAmount,
      paymentDate: paymentTimestamp,
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

    transaction.set(idempotencyRef, {
      idempotencyKey,
      requestHash,
      actorUid: actor.uid,
      paymentId,
      invoiceId: invoice.id,
      createdAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);

    return { paymentId, created: true };
  });

  return getPaymentByIdService(transactionResult.paymentId);
}

export async function cancelPaymentService({
  actor,
  id,
}: PaymentIdParams): Promise<PaymentDetail> {
  const db = getDb();
  const paymentRef = db.collection(COLLECTIONS.payments).doc(id);

  const result = await db.runTransaction(async (transaction) => {
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
      return { payment: oldPayment, changed: false };
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

    if (compareMoney(invoice.paidAmount, oldPayment.amount) < 0) {
      throw new AppError(
        "Saldo invoice tidak konsisten dengan ledger pembayaran. Jalankan migrasi finance sebelum melakukan reversal.",
        409,
        "INVOICE_PAYMENT_PROJECTION_INCONSISTENT",
      );
    }

    const nextPaidAmount = subtractMoney(
      invoice.paidAmount,
      oldPayment.amount,
    );
    const remainingAmount = subtractMoney(invoice.totalAmount, nextPaidAmount);
    const nextStatus = deriveInvoicePaymentStatus(
      invoice.totalAmount,
      nextPaidAmount,
      invoice.status,
    );
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "PAYMENT_REVERSED",
      module: "payment",
      entityId: id,
      entityType: "payment",
      oldValue: {
        status: oldPayment.status,
        amount: oldPayment.amount,
      },
      newValue: {
        status: "CANCELLED",
        paidAmount: nextPaidAmount,
        remainingAmount,
      },
    });

    transaction.update(paymentRef, {
      status: "CANCELLED",
      reversedAt: serverTimestamp(),
      reversedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });
    transaction.update(invoiceRef, {
      paidAmount: nextPaidAmount,
      remainingAmount,
      status: nextStatus,
      paidAt: nextStatus === "PAID" ? invoiceSnap.data()?.paidAt ?? null : null,
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);

    return {
      payment: { ...oldPayment, status: "CANCELLED" as const },
      changed: true,
    };
  });

  if (!result.changed) {
    return result.payment;
  }

  return getPaymentByIdService(id);
}
