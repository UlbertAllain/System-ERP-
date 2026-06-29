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
  InvoiceDetail,
  InvoiceLineItem,
  InvoiceListItem,
  InvoiceStatus,
} from "@/types/invoice";

type RawInvoiceLineItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type CreateInvoiceParams = {
  actor: CurrentUser;
  invoiceNumber: string;
  clientId: string;
  projectId?: string | null;
  issueDate: string;
  dueDate: string;
  discountAmount: number;
  taxAmount: number;
  paidAmount: number;
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

type MarkInvoicePaidParams = {
  actor: CurrentUser;
  id: string;
  paidAmount: number;
};

type ListInvoicesParams = {
  clientId?: string;
  projectId?: string;
  status?: InvoiceStatus;
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

type InvoiceTotals = {
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
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

function normalizeInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber.trim().toUpperCase();
}

function dateStringToTimestamp(value: string): Timestamp {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  return Timestamp.fromDate(date);
}

function assertValidInvoiceDateRange(issueDate: string, dueDate: string): void {
  const issue = new Date(issueDate);
  const due = new Date(dueDate);

  if (Number.isNaN(issue.getTime()) || Number.isNaN(due.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  if (due.getTime() < issue.getTime()) {
    throw new AppError(
      "Due date tidak boleh sebelum issue date.",
      400,
      "INVALID_INVOICE_DATE_RANGE",
    );
  }
}

function calculateInvoiceTotals({
  lineItems,
  discountAmount,
  taxAmount,
  paidAmount,
}: {
  lineItems: RawInvoiceLineItem[];
  discountAmount: number;
  taxAmount: number;
  paidAmount: number;
}): InvoiceTotals {
  const normalizedLineItems = lineItems.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const amount = quantity * unitPrice;

    return {
      id: item.id ?? `item_${crypto.randomUUID()}`,
      description: item.description.trim(),
      quantity,
      unitPrice,
      amount,
    };
  });

  const subtotal = normalizedLineItems.reduce(
    (total, item) => total + item.amount,
    0,
  );

  if (discountAmount > subtotal) {
    throw new AppError(
      "Diskon tidak boleh lebih besar dari subtotal.",
      400,
      "INVALID_INVOICE_DISCOUNT",
    );
  }

  const totalAmount = subtotal - discountAmount + taxAmount;

  if (paidAmount > totalAmount) {
    throw new AppError(
      "Paid amount tidak boleh lebih besar dari total invoice.",
      400,
      "INVALID_INVOICE_PAID_AMOUNT",
    );
  }

  return {
    lineItems: normalizedLineItems,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    paidAmount,
    remainingAmount: totalAmount - paidAmount,
  };
}

function getInvoiceStatusFromPayment(
  currentStatus: InvoiceStatus,
  totalAmount: number,
  paidAmount: number,
): InvoiceStatus {
  if (currentStatus === "VOID") {
    return "VOID";
  }

  if (paidAmount >= totalAmount && totalAmount > 0) {
    return "PAID";
  }

  return currentStatus;
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
    lineItems: (data.lineItems ?? []) as InvoiceLineItem[],

    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

function toInvoiceListItem(invoice: InvoiceDetail): InvoiceListItem {
  const { lineItems: _lineItems, ...listItem } = invoice;

  return listItem;
}

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

async function getClientSnapshotOrThrow(
  clientId: string,
): Promise<ClientSnapshot> {
  const clientSnap = await getDb()
    .collection(COLLECTIONS.clients)
    .doc(clientId)
    .get();

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

async function getProjectSnapshotOrThrow(
  projectId: string,
): Promise<ProjectSnapshot> {
  const projectSnap = await getDb()
    .collection(COLLECTIONS.projects)
    .doc(projectId)
    .get();

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

  return {
    id: projectSnap.id,
    name: String(project.name ?? ""),
    projectCode: String(project.projectCode ?? ""),
    clientId: String(project.clientId ?? ""),
  };
}

async function resolveProjectForClient(
  clientId: string,
  projectId?: string | null,
): Promise<ProjectSnapshot | null> {
  if (!projectId) {
    return null;
  }

  const project = await getProjectSnapshotOrThrow(projectId);

  if (project.clientId !== clientId) {
    throw new AppError(
      "Project tidak terhubung ke client invoice.",
      400,
      "PROJECT_CLIENT_MISMATCH",
    );
  }

  return project;
}

async function getInvoiceDocumentOrThrow(id: string): Promise<InvoiceDetail> {
  const invoiceSnap = await getDb()
    .collection(COLLECTIONS.invoices)
    .doc(id)
    .get();

  if (!invoiceSnap.exists) {
    throw new AppError("Invoice tidak ditemukan.", 404, "INVOICE_NOT_FOUND");
  }

  return normalizeInvoiceDocument(invoiceSnap.id, invoiceSnap.data() ?? {});
}

export async function listInvoicesService({
  clientId,
  projectId,
  status,
}: ListInvoicesParams = {}): Promise<InvoiceListItem[]> {
  const baseQuery = getDb().collection(COLLECTIONS.invoices);

  let querySnap;

  if (clientId) {
    querySnap = await baseQuery.where("clientId", "==", clientId).get();
  } else if (projectId) {
    querySnap = await baseQuery.where("projectId", "==", projectId).get();
  } else if (status) {
    querySnap = await baseQuery.where("status", "==", status).get();
  } else {
    querySnap = await baseQuery.get();
  }

  return querySnap.docs
    .map((doc) => normalizeInvoiceDocument(doc.id, doc.data()))
    .filter((invoice) => invoice.deletedAt === null)
    .filter((invoice) => {
      if (clientId && invoice.clientId !== clientId) return false;
      if (projectId && invoice.projectId !== projectId) return false;
      if (status && invoice.status !== status) return false;

      return true;
    })
    .map(toInvoiceListItem)
    .sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
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
  paidAmount,
  notes,
  lineItems,
}: CreateInvoiceParams): Promise<InvoiceDetail> {
  const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);

  assertValidInvoiceDateRange(issueDate, dueDate);
  await assertInvoiceNumberUnique(normalizedInvoiceNumber);

  const [client, project] = await Promise.all([
    getClientSnapshotOrThrow(clientId),
    resolveProjectForClient(clientId, projectId),
  ]);

  const totals = calculateInvoiceTotals({
    lineItems,
    discountAmount,
    taxAmount,
    paidAmount,
  });

  const invoiceId = createDocumentId("invoices");
  const status = getInvoiceStatusFromPayment(
    "DRAFT",
    totals.totalAmount,
    totals.paidAmount,
  );

  await getDb()
    .collection(COLLECTIONS.invoices)
    .doc(invoiceId)
    .set({
      id: invoiceId,
      invoiceNumber: normalizedInvoiceNumber,

      clientId: client.id,
      clientName: client.name,
      clientCompany: client.company,

      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectCode: project?.projectCode ?? null,

      status,

      issueDate: dateStringToTimestamp(issueDate),
      dueDate: dateStringToTimestamp(dueDate),
      paidAt: status === "PAID" ? serverTimestamp() : null,

      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      paidAmount: totals.paidAmount,
      remainingAmount: totals.remainingAmount,

      notes: normalizeNullableString(notes),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });

  await writeAuditLog({
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
      status,
      totalAmount: totals.totalAmount,
      paidAmount: totals.paidAmount,
      remainingAmount: totals.remainingAmount,
    },
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
  paidAmount,
  notes,
  lineItems,
}: UpdateInvoiceParams): Promise<InvoiceDetail> {
  const oldInvoice = await getInvoiceByIdService(id);

  if (oldInvoice.status === "VOID") {
    throw new AppError(
      "Invoice VOID tidak bisa diperbarui.",
      400,
      "INVOICE_VOID_LOCKED",
    );
  }

  const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);

  assertValidInvoiceDateRange(issueDate, dueDate);
  await assertInvoiceNumberUnique(normalizedInvoiceNumber, id);

  const [client, project] = await Promise.all([
    getClientSnapshotOrThrow(clientId),
    resolveProjectForClient(clientId, projectId),
  ]);

  const totals = calculateInvoiceTotals({
    lineItems,
    discountAmount,
    taxAmount,
    paidAmount,
  });

  const nextStatus = getInvoiceStatusFromPayment(
    oldInvoice.status,
    totals.totalAmount,
    totals.paidAmount,
  );

  await getDb()
    .collection(COLLECTIONS.invoices)
    .doc(id)
    .update({
      invoiceNumber: normalizedInvoiceNumber,

      clientId: client.id,
      clientName: client.name,
      clientCompany: client.company,

      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectCode: project?.projectCode ?? null,

      status: nextStatus,

      issueDate: dateStringToTimestamp(issueDate),
      dueDate: dateStringToTimestamp(dueDate),
      paidAt:
        nextStatus === "PAID"
          ? oldInvoice.paidAt
            ? Timestamp.fromDate(oldInvoice.paidAt)
            : serverTimestamp()
          : null,

      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      paidAmount: totals.paidAmount,
      remainingAmount: totals.remainingAmount,

      notes: normalizeNullableString(notes),

      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "INVOICE_UPDATED",
    module: "invoice",
    entityId: id,
    entityType: "invoice",
    oldValue: {
      invoiceNumber: oldInvoice.invoiceNumber,
      clientId: oldInvoice.clientId,
      projectId: oldInvoice.projectId,
      status: oldInvoice.status,
      totalAmount: oldInvoice.totalAmount,
      paidAmount: oldInvoice.paidAmount,
    },
    newValue: {
      invoiceNumber: normalizedInvoiceNumber,
      clientId: client.id,
      projectId: project?.id ?? null,
      status: nextStatus,
      totalAmount: totals.totalAmount,
      paidAmount: totals.paidAmount,
    },
  });

  return getInvoiceByIdService(id);
}

export async function issueInvoiceService({
  actor,
  id,
}: InvoiceIdParams): Promise<InvoiceDetail> {
  const oldInvoice = await getInvoiceByIdService(id);

  if (oldInvoice.status !== "DRAFT") {
    throw new AppError(
      "Hanya invoice DRAFT yang bisa diterbitkan.",
      400,
      "INVOICE_NOT_DRAFT",
    );
  }

  await getDb().collection(COLLECTIONS.invoices).doc(id).update({
    status: "ISSUED",
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "INVOICE_ISSUED",
    module: "invoice",
    entityId: id,
    entityType: "invoice",
    oldValue: {
      status: oldInvoice.status,
    },
    newValue: {
      status: "ISSUED",
    },
  });

  return getInvoiceByIdService(id);
}

export async function markInvoicePaidService({
  actor,
  id,
  paidAmount,
}: MarkInvoicePaidParams): Promise<InvoiceDetail> {
  const oldInvoice = await getInvoiceByIdService(id);

  if (oldInvoice.status === "VOID") {
    throw new AppError(
      "Invoice VOID tidak bisa ditandai paid.",
      400,
      "INVOICE_VOID_LOCKED",
    );
  }

  if (paidAmount > oldInvoice.totalAmount) {
    throw new AppError(
      "Paid amount tidak boleh lebih besar dari total invoice.",
      400,
      "INVALID_INVOICE_PAID_AMOUNT",
    );
  }

  const nextStatus =
    paidAmount >= oldInvoice.totalAmount && oldInvoice.totalAmount > 0
      ? "PAID"
      : oldInvoice.status;

  await getDb()
    .collection(COLLECTIONS.invoices)
    .doc(id)
    .update({
      paidAmount,
      remainingAmount: oldInvoice.totalAmount - paidAmount,
      status: nextStatus,
      paidAt:
        nextStatus === "PAID"
          ? oldInvoice.paidAt
            ? Timestamp.fromDate(oldInvoice.paidAt)
            : serverTimestamp()
          : null,
      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "INVOICE_MARKED_PAID",
    module: "invoice",
    entityId: id,
    entityType: "invoice",
    oldValue: {
      status: oldInvoice.status,
      paidAmount: oldInvoice.paidAmount,
      remainingAmount: oldInvoice.remainingAmount,
    },
    newValue: {
      status: nextStatus,
      paidAmount,
      remainingAmount: oldInvoice.totalAmount - paidAmount,
    },
  });

  return getInvoiceByIdService(id);
}

export async function voidInvoiceService({
  actor,
  id,
}: InvoiceIdParams): Promise<InvoiceDetail> {
  const oldInvoice = await getInvoiceByIdService(id);

  if (oldInvoice.status === "PAID") {
    throw new AppError(
      "Invoice PAID tidak bisa langsung di-void.",
      400,
      "INVOICE_PAID_VOID_BLOCKED",
    );
  }

  if (oldInvoice.status === "VOID") {
    return oldInvoice;
  }

  await getDb().collection(COLLECTIONS.invoices).doc(id).update({
    status: "VOID",
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "INVOICE_VOIDED",
    module: "invoice",
    entityId: id,
    entityType: "invoice",
    oldValue: {
      status: oldInvoice.status,
    },
    newValue: {
      status: "VOID",
    },
  });

  return getInvoiceByIdService(id);
}

export async function deleteInvoiceService({
  actor,
  id,
}: InvoiceIdParams): Promise<InvoiceDetail> {
  const oldInvoice = await getInvoiceByIdService(id);

  await getDb().collection(COLLECTIONS.invoices).doc(id).update({
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "INVOICE_DELETED",
    module: "invoice",
    entityId: id,
    entityType: "invoice",
    oldValue: {
      invoiceNumber: oldInvoice.invoiceNumber,
      status: oldInvoice.status,
      deletedAt: oldInvoice.deletedAt,
    },
    newValue: {
      deletedAt: "SERVER_TIMESTAMP",
    },
  });

  return {
    ...oldInvoice,
    deletedAt: new Date(),
  };
}
