import "server-only";

import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";

import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { getAuditLogDocument } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/types/auth";
import type { PaginatedResult } from "@/types/common";
import type {
  InvoiceDetail,
  InvoiceListItem,
  InvoiceStatus,
} from "@/types/invoice";

import {
  normalizeNullableString,
  normalizeSearchText,
  dateStringToTimestamp,
} from "@/lib/domain/firestore-value";
import {
  assertValidInvoiceDateRange,
  calculateInvoiceTotals,
  getInvoiceNumberLockId,
  normalizeInvoiceNumber,
  type RawInvoiceLineItem,
} from "@/modules/finance/invoices/invoice-domain";
import { normalizeInvoiceDocument } from "@/modules/finance/invoices/invoice-mapper";
import {
  findInvoiceById,
  listInvoices,
  listInvoicesPaginated,
} from "@/modules/finance/repositories/invoice-repository";

type CreateInvoiceParams = {
  actor: CurrentUser;
  invoiceNumber: string;
  clientId: string;
  projectId?: string | null;
  issueDate: string;
  dueDate: string;
  discountAmount: number;
  taxAmount: number;
  notes?: string | null;
  lineItems: RawInvoiceLineItem[];
};

type UpdateInvoiceParams = CreateInvoiceParams & {
  id: string;
};

type InvoiceIdParams = {
  actor: CurrentUser;
  id: string;
};

type ListInvoicesParams = {
  clientId?: string;
  projectId?: string;
  status?: InvoiceStatus;
};

type ListInvoicesPaginatedParams = ListInvoicesParams & {
  search?: string;
  page: number;
  pageSize: number;
};

type ClientSnapshot = {
  id: string;
  name: string;
  company: string | null;
};

type ProjectSnapshot = {
  id: string;
  name: string;
  projectCode: string;
  clientId: string;
};


async function assertInvoiceNumberUnique(
  invoiceNumber: string,
  ignoredInvoiceId?: string,
): Promise<void> {
  const normalizedNumber = normalizeInvoiceNumber(invoiceNumber);

  const querySnap = await getDb()
    .collection(COLLECTIONS.invoices)
    .where("invoiceNumber", "==", normalizedNumber)
    .limit(1)
    .get();

  if (querySnap.empty) {
    return;
  }

  const existingDoc = querySnap.docs[0];

  if (existingDoc.id !== ignoredInvoiceId) {
    throw new AppError(
      "Nomor invoice sudah digunakan.",
      409,
      "INVOICE_NUMBER_ALREADY_USED",
    );
  }
}

function normalizeClientSnapshotOrThrow(
  clientSnap: DocumentSnapshot<DocumentData>,
): ClientSnapshot {
  if (!clientSnap.exists) {
    throw new AppError("Client tidak ditemukan.", 404, "CLIENT_NOT_FOUND");
  }

  const client = clientSnap.data() ?? {};

  if (client.deletedAt) {
    throw new AppError("Client sudah dihapus.", 400, "CLIENT_DELETED");
  }

  if (client.status === "ARCHIVED") {
    throw new AppError("Client sudah diarsipkan.", 400, "CLIENT_ARCHIVED");
  }

  return {
    id: clientSnap.id,
    name: String(client.name ?? ""),
    company: client.company ?? null,
  };
}

function normalizeProjectSnapshotOrThrow(
  projectSnap: DocumentSnapshot<DocumentData>,
  clientId: string,
): ProjectSnapshot {
  if (!projectSnap.exists) {
    throw new AppError("Project tidak ditemukan.", 404, "PROJECT_NOT_FOUND");
  }

  const project = projectSnap.data() ?? {};

  if (project.deletedAt) {
    throw new AppError("Project sudah dihapus.", 400, "PROJECT_DELETED");
  }

  if (project.status === "ARCHIVED") {
    throw new AppError("Project sudah diarsipkan.", 400, "PROJECT_ARCHIVED");
  }

  if (String(project.clientId ?? "") !== clientId) {
    throw new AppError(
      "Project tidak terhubung ke client invoice.",
      400,
      "PROJECT_CLIENT_MISMATCH",
    );
  }

  return {
    id: projectSnap.id,
    name: String(project.name ?? ""),
    projectCode: String(project.projectCode ?? ""),
    clientId: String(project.clientId ?? ""),
  };
}

async function getInvoiceDocumentOrThrow(id: string): Promise<InvoiceDetail> {
  const invoice = await findInvoiceById(id);

  if (!invoice) {
    throw new AppError("Invoice tidak ditemukan.", 404, "INVOICE_NOT_FOUND");
  }

  return invoice;
}

export async function listInvoicesService(
  input: ListInvoicesParams = {},
): Promise<InvoiceListItem[]> {
  return listInvoices(input);
}

export async function listInvoicesPaginatedService(
  input: ListInvoicesPaginatedParams,
): Promise<PaginatedResult<InvoiceListItem>> {
  return listInvoicesPaginated(input);
}

export async function getInvoiceByIdService(
  id: string,
): Promise<InvoiceDetail> {
  const invoice = await getInvoiceDocumentOrThrow(id);

  if (invoice.deletedAt) {
    throw new AppError("Invoice sudah dihapus.", 404, "INVOICE_DELETED");
  }

  return invoice;
}

export async function createInvoiceService({
  actor,
  invoiceNumber,
  clientId,
  projectId,
  issueDate,
  dueDate,
  discountAmount,
  taxAmount,
  notes,
  lineItems,
}: CreateInvoiceParams): Promise<InvoiceDetail> {
  const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
  assertValidInvoiceDateRange(issueDate, dueDate);
  // Menjaga data lama yang belum memiliki invoiceNumberLocks.
  await assertInvoiceNumberUnique(normalizedInvoiceNumber);

  const totals = calculateInvoiceTotals({
    lineItems,
    discountAmount,
    taxAmount,
  });

  const db = getDb();
  const invoiceId = createDocumentId("invoices");
  const invoiceRef = db.collection(COLLECTIONS.invoices).doc(invoiceId);
  const lockRef = db
    .collection(COLLECTIONS.invoiceNumberLocks)
    .doc(getInvoiceNumberLockId(normalizedInvoiceNumber));
  const clientRef = db.collection(COLLECTIONS.clients).doc(clientId);
  const projectRef = projectId
    ? db.collection(COLLECTIONS.projects).doc(projectId)
    : null;

  await db.runTransaction(async (transaction) => {
    const lockSnap = await transaction.get(lockRef);
    const clientSnap = await transaction.get(clientRef);
    const projectSnap = projectRef ? await transaction.get(projectRef) : null;

    if (lockSnap.exists) {
      throw new AppError(
        "Nomor invoice sudah digunakan.",
        409,
        "INVOICE_NUMBER_ALREADY_USED",
      );
    }

    const client = normalizeClientSnapshotOrThrow(clientSnap);
    const project = projectSnap
      ? normalizeProjectSnapshotOrThrow(projectSnap, client.id)
      : null;
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "INVOICE_CREATED",
      module: "invoice",
      entityId: invoiceId,
      entityType: "invoice",
      oldValue: null,
      newValue: {
        id: invoiceId,
        invoiceNumber: normalizedInvoiceNumber,
        clientId: client.id,
        projectId: project?.id ?? null,
        status: "DRAFT",
        totalAmount: totals.totalAmount,
        paidAmount: 0,
        remainingAmount: totals.totalAmount,
      },
    });

    transaction.set(invoiceRef, {
      id: invoiceId,
      invoiceNumber: normalizedInvoiceNumber,
      clientId: client.id,
      clientName: client.name,
      clientCompany: client.company,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectCode: project?.projectCode ?? null,
      searchText: normalizeSearchText(
        normalizedInvoiceNumber,
        client.name,
        client.company,
        project?.name,
        project?.projectCode,
      ),
      status: "DRAFT",
      issueDate: dateStringToTimestamp(issueDate),
      dueDate: dateStringToTimestamp(dueDate),
      paidAt: null,
      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      // paidAmount dan remainingAmount adalah projection dari payment ledger.
      paidAmount: 0,
      remainingAmount: totals.totalAmount,
      notes: normalizeNullableString(notes),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });
    transaction.set(lockRef, {
      invoiceId,
      invoiceNumber: normalizedInvoiceNumber,
      createdAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getInvoiceByIdService(invoiceId);
}

export async function updateInvoiceService({
  actor,
  id,
  invoiceNumber,
  clientId,
  projectId,
  issueDate,
  dueDate,
  discountAmount,
  taxAmount,
  notes,
  lineItems,
}: UpdateInvoiceParams): Promise<InvoiceDetail> {
  const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
  assertValidInvoiceDateRange(issueDate, dueDate);
  await assertInvoiceNumberUnique(normalizedInvoiceNumber, id);

  const totals = calculateInvoiceTotals({
    lineItems,
    discountAmount,
    taxAmount,
  });

  const db = getDb();
  const invoiceRef = db.collection(COLLECTIONS.invoices).doc(id);
  const newLockRef = db
    .collection(COLLECTIONS.invoiceNumberLocks)
    .doc(getInvoiceNumberLockId(normalizedInvoiceNumber));
  const clientRef = db.collection(COLLECTIONS.clients).doc(clientId);
  const projectRef = projectId
    ? db.collection(COLLECTIONS.projects).doc(projectId)
    : null;

  await db.runTransaction(async (transaction) => {
    const invoiceSnap = await transaction.get(invoiceRef);
    const clientSnap = await transaction.get(clientRef);
    const projectSnap = projectRef ? await transaction.get(projectRef) : null;

    if (!invoiceSnap.exists) {
      throw new AppError("Invoice tidak ditemukan.", 404, "INVOICE_NOT_FOUND");
    }

    const oldInvoice = normalizeInvoiceDocument(
      invoiceSnap.id,
      invoiceSnap.data() ?? {},
    );

    if (oldInvoice.deletedAt) {
      throw new AppError("Invoice sudah dihapus.", 404, "INVOICE_DELETED");
    }

    if (oldInvoice.status !== "DRAFT") {
      throw new AppError(
        "Invoice yang sudah diterbitkan tidak dapat diubah. Batalkan dan buat invoice baru bila ada koreksi.",
        409,
        "INVOICE_CONTENT_LOCKED",
      );
    }

    if (oldInvoice.paidAmount > 0) {
      throw new AppError(
        "Invoice yang memiliki pembayaran tidak dapat diubah.",
        409,
        "INVOICE_HAS_PAYMENTS",
      );
    }

    const client = normalizeClientSnapshotOrThrow(clientSnap);
    const project = projectSnap
      ? normalizeProjectSnapshotOrThrow(projectSnap, client.id)
      : null;
    const numberChanged = oldInvoice.invoiceNumber !== normalizedInvoiceNumber;
    const oldLockRef = db
      .collection(COLLECTIONS.invoiceNumberLocks)
      .doc(getInvoiceNumberLockId(oldInvoice.invoiceNumber));
    const [newLockSnap, oldLockSnap] = await Promise.all([
      transaction.get(newLockRef),
      numberChanged ? transaction.get(oldLockRef) : Promise.resolve(null),
    ]);

    if (
      newLockSnap.exists &&
      String(newLockSnap.data()?.invoiceId ?? "") !== id
    ) {
      throw new AppError(
        "Nomor invoice sudah digunakan.",
        409,
        "INVOICE_NUMBER_ALREADY_USED",
      );
    }

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "INVOICE_UPDATED",
      module: "invoice",
      entityId: id,
      entityType: "invoice",
      oldValue: {
        invoiceNumber: oldInvoice.invoiceNumber,
        clientId: oldInvoice.clientId,
        projectId: oldInvoice.projectId,
        totalAmount: oldInvoice.totalAmount,
      },
      newValue: {
        invoiceNumber: normalizedInvoiceNumber,
        clientId: client.id,
        projectId: project?.id ?? null,
        totalAmount: totals.totalAmount,
      },
    });

    transaction.update(invoiceRef, {
      invoiceNumber: normalizedInvoiceNumber,
      clientId: client.id,
      clientName: client.name,
      clientCompany: client.company,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectCode: project?.projectCode ?? null,
      searchText: normalizeSearchText(
        normalizedInvoiceNumber,
        client.name,
        client.company,
        project?.name,
        project?.projectCode,
      ),
      issueDate: dateStringToTimestamp(issueDate),
      dueDate: dateStringToTimestamp(dueDate),
      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      paidAmount: 0,
      remainingAmount: totals.totalAmount,
      notes: normalizeNullableString(notes),
      updatedAt: serverTimestamp(),
    });

    if (numberChanged || !newLockSnap.exists) {
      if (
        numberChanged &&
        oldLockSnap?.exists &&
        String(oldLockSnap.data()?.invoiceId ?? "") === id
      ) {
        transaction.delete(oldLockRef);
      }
      transaction.set(newLockRef, {
        invoiceId: id,
        invoiceNumber: normalizedInvoiceNumber,
        createdAt: serverTimestamp(),
      });
    }

    transaction.set(auditLog.ref, auditLog.data);
  });

  return getInvoiceByIdService(id);
}

export async function issueInvoiceService({
  actor,
  id,
}: InvoiceIdParams): Promise<InvoiceDetail> {
  const db = getDb();
  const invoiceRef = db.collection(COLLECTIONS.invoices).doc(id);

  await db.runTransaction(async (transaction) => {
    const invoiceSnap = await transaction.get(invoiceRef);

    if (!invoiceSnap.exists) {
      throw new AppError("Invoice tidak ditemukan.", 404, "INVOICE_NOT_FOUND");
    }

    const oldInvoice = normalizeInvoiceDocument(
      invoiceSnap.id,
      invoiceSnap.data() ?? {},
    );

    if (oldInvoice.deletedAt) {
      throw new AppError("Invoice sudah dihapus.", 404, "INVOICE_DELETED");
    }

    if (oldInvoice.status !== "DRAFT") {
      throw new AppError(
        "Hanya invoice DRAFT yang bisa diterbitkan.",
        400,
        "INVOICE_NOT_DRAFT",
      );
    }

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "INVOICE_ISSUED",
      module: "invoice",
      entityId: id,
      entityType: "invoice",
      oldValue: { status: oldInvoice.status },
      newValue: { status: "ISSUED" },
    });

    transaction.update(invoiceRef, {
      status: "ISSUED",
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getInvoiceByIdService(id);
}

export async function voidInvoiceService({
  actor,
  id,
}: InvoiceIdParams): Promise<InvoiceDetail> {
  const db = getDb();
  const invoiceRef = db.collection(COLLECTIONS.invoices).doc(id);

  await db.runTransaction(async (transaction) => {
    const invoiceSnap = await transaction.get(invoiceRef);

    if (!invoiceSnap.exists) {
      throw new AppError("Invoice tidak ditemukan.", 404, "INVOICE_NOT_FOUND");
    }

    const oldInvoice = normalizeInvoiceDocument(
      invoiceSnap.id,
      invoiceSnap.data() ?? {},
    );

    if (oldInvoice.deletedAt) {
      throw new AppError("Invoice sudah dihapus.", 404, "INVOICE_DELETED");
    }

    if (oldInvoice.status === "VOID") {
      return;
    }

    if (oldInvoice.status === "DRAFT") {
      throw new AppError(
        "Invoice DRAFT sebaiknya dihapus, bukan di-void.",
        400,
        "DRAFT_INVOICE_CANNOT_BE_VOIDED",
      );
    }

    if (oldInvoice.paidAmount > 0) {
      throw new AppError(
        "Invoice yang memiliki pembayaran tidak dapat di-void. Batalkan seluruh pembayaran terlebih dahulu.",
        409,
        "INVOICE_HAS_PAYMENTS",
      );
    }

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "INVOICE_VOIDED",
      module: "invoice",
      entityId: id,
      entityType: "invoice",
      oldValue: { status: oldInvoice.status },
      newValue: { status: "VOID" },
    });

    transaction.update(invoiceRef, {
      status: "VOID",
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getInvoiceByIdService(id);
}

export async function deleteInvoiceService({
  actor,
  id,
}: InvoiceIdParams): Promise<InvoiceDetail> {
  const db = getDb();
  const invoiceRef = db.collection(COLLECTIONS.invoices).doc(id);
  const deletedInvoice = await db.runTransaction(async (transaction) => {
    const invoiceSnap = await transaction.get(invoiceRef);

    if (!invoiceSnap.exists) {
      throw new AppError("Invoice tidak ditemukan.", 404, "INVOICE_NOT_FOUND");
    }

    const oldInvoice = normalizeInvoiceDocument(
      invoiceSnap.id,
      invoiceSnap.data() ?? {},
    );
    if (oldInvoice.deletedAt) {
      throw new AppError("Invoice sudah dihapus.", 404, "INVOICE_DELETED");
    }

    if (oldInvoice.status !== "DRAFT" || oldInvoice.paidAmount > 0) {
      throw new AppError(
        "Hanya invoice DRAFT tanpa pembayaran yang dapat dihapus.",
        409,
        "INVOICE_DELETE_BLOCKED",
      );
    }

    const lockRef = db
      .collection(COLLECTIONS.invoiceNumberLocks)
      .doc(getInvoiceNumberLockId(oldInvoice.invoiceNumber));
    const lockSnap = await transaction.get(lockRef);
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "INVOICE_DELETED",
      module: "invoice",
      entityId: id,
      entityType: "invoice",
      oldValue: {
        invoiceNumber: oldInvoice.invoiceNumber,
        status: oldInvoice.status,
      },
      newValue: { deletedAt: "SERVER_TIMESTAMP" },
    });

    transaction.update(invoiceRef, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (lockSnap.exists && String(lockSnap.data()?.invoiceId ?? "") === id) {
      transaction.delete(lockRef);
    }

    transaction.set(auditLog.ref, auditLog.data);
    return oldInvoice;
  });

  return {
    ...deletedInvoice,
    deletedAt: new Date(),
  };
}
