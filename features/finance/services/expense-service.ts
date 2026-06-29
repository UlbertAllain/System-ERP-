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
  ExpenseCategory,
  ExpenseDetail,
  ExpenseListItem,
  ExpenseStatus,
} from "@/types/expense";

type CreateExpenseParams = {
  actor: CurrentUser;
  expenseNumber: string;
  title: string;
  description?: string | null;
  category: ExpenseCategory;
  projectId?: string | null;
  vendorName?: string | null;
  amount: number;
  expenseDate: string;
  notes?: string | null;
};

type UpdateExpenseParams = CreateExpenseParams & {
  id: string;
};

type ExpenseIdParams = {
  actor: CurrentUser;
  id: string;
};

type RejectExpenseParams = {
  actor: CurrentUser;
  id: string;
  reason: string;
};

type ListExpensesParams = {
  projectId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
};

type ProjectSnapshot = {
  id: string;
  name: string;
  projectCode: string;
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

function normalizeExpenseNumber(expenseNumber: string): string {
  return expenseNumber.trim().toUpperCase();
}

function dateStringToTimestamp(value: string): Timestamp {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Format tanggal tidak valid.", 400, "INVALID_DATE");
  }

  return Timestamp.fromDate(date);
}

function normalizeExpenseDocument(
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

async function assertExpenseNumberUnique(
  expenseNumber: string,
  ignoredExpenseId?: string,
): Promise<void> {
  const normalizedNumber = normalizeExpenseNumber(expenseNumber);

  const querySnap = await getDb()
    .collection(COLLECTIONS.expenses)
    .where("expenseNumber", "==", normalizedNumber)
    .limit(1)
    .get();

  if (querySnap.empty) {
    return;
  }

  const existingDoc = querySnap.docs[0];

  if (existingDoc.id !== ignoredExpenseId) {
    throw new AppError(
      "Nomor expense sudah digunakan.",
      409,
      "EXPENSE_NUMBER_ALREADY_USED",
    );
  }
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
  };
}

async function resolveProject(
  projectId?: string | null,
): Promise<ProjectSnapshot | null> {
  if (!projectId) {
    return null;
  }

  return getProjectSnapshotOrThrow(projectId);
}

async function getExpenseDocumentOrThrow(id: string): Promise<ExpenseDetail> {
  const expenseSnap = await getDb()
    .collection(COLLECTIONS.expenses)
    .doc(id)
    .get();

  if (!expenseSnap.exists) {
    throw new AppError("Expense tidak ditemukan.", 404, "EXPENSE_NOT_FOUND");
  }

  return normalizeExpenseDocument(expenseSnap.id, expenseSnap.data() ?? {});
}

export async function listExpensesService({
  projectId,
  status,
  category,
}: ListExpensesParams = {}): Promise<ExpenseListItem[]> {
  const baseQuery = getDb().collection(COLLECTIONS.expenses);

  let querySnap;

  if (projectId) {
    querySnap = await baseQuery.where("projectId", "==", projectId).get();
  } else if (status) {
    querySnap = await baseQuery.where("status", "==", status).get();
  } else if (category) {
    querySnap = await baseQuery.where("category", "==", category).get();
  } else {
    querySnap = await baseQuery.get();
  }

  return querySnap.docs
    .map((doc) => normalizeExpenseDocument(doc.id, doc.data()))
    .filter((expense) => expense.deletedAt === null)
    .filter((expense) => {
      if (projectId && expense.projectId !== projectId) return false;
      if (status && expense.status !== status) return false;
      if (category && expense.category !== category) return false;

      return true;
    })
    .sort((a, b) => {
      const aTime = a.expenseDate?.getTime() ?? 0;
      const bTime = b.expenseDate?.getTime() ?? 0;

      return bTime - aTime;
    });
}

export async function getExpenseByIdService(
  id: string,
): Promise<ExpenseDetail> {
  const expense = await getExpenseDocumentOrThrow(id);

  if (expense.deletedAt) {
    throw new AppError("Expense sudah dihapus.", 404, "EXPENSE_DELETED");
  }

  return expense;
}

export async function createExpenseService({
  actor,
  expenseNumber,
  title,
  description,
  category,
  projectId,
  vendorName,
  amount,
  expenseDate,
  notes,
}: CreateExpenseParams): Promise<ExpenseDetail> {
  const normalizedExpenseNumber = normalizeExpenseNumber(expenseNumber);

  await assertExpenseNumberUnique(normalizedExpenseNumber);

  const project = await resolveProject(projectId);
  const expenseId = createDocumentId("expenses");
  const expenseTitle = title.trim();

  await getDb()
    .collection(COLLECTIONS.expenses)
    .doc(expenseId)
    .set({
      id: expenseId,

      expenseNumber: normalizedExpenseNumber,
      title: expenseTitle,
      description: normalizeNullableString(description),

      category,
      status: "DRAFT",

      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectCode: project?.projectCode ?? null,

      vendorName: normalizeNullableString(vendorName),
      amount,
      expenseDate: dateStringToTimestamp(expenseDate),
      paidAt: null,

      receipt: null,
      notes: normalizeNullableString(notes),

      createdByUserId: actor.uid,
      createdByName: actor.name,
      approvedByUserId: null,
      approvedByName: null,
      rejectedReason: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });

  await writeAuditLog({
    user: actor,
    action: "EXPENSE_CREATED",
    module: "expense",
    entityId: expenseId,
    entityType: "expense",
    oldValue: null,
    newValue: {
      id: expenseId,
      expenseNumber: normalizedExpenseNumber,
      title: expenseTitle,
      category,
      projectId: project?.id ?? null,
      amount,
      status: "DRAFT",
    },
  });

  return getExpenseByIdService(expenseId);
}

export async function updateExpenseService({
  actor,
  id,
  expenseNumber,
  title,
  description,
  category,
  projectId,
  vendorName,
  amount,
  expenseDate,
  notes,
}: UpdateExpenseParams): Promise<ExpenseDetail> {
  const oldExpense = await getExpenseByIdService(id);

  if (oldExpense.status === "PAID") {
    throw new AppError(
      "Expense PAID tidak bisa diperbarui.",
      400,
      "EXPENSE_PAID_LOCKED",
    );
  }

  const normalizedExpenseNumber = normalizeExpenseNumber(expenseNumber);

  await assertExpenseNumberUnique(normalizedExpenseNumber, id);

  const project = await resolveProject(projectId);
  const expenseTitle = title.trim();

  await getDb()
    .collection(COLLECTIONS.expenses)
    .doc(id)
    .update({
      expenseNumber: normalizedExpenseNumber,
      title: expenseTitle,
      description: normalizeNullableString(description),

      category,

      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectCode: project?.projectCode ?? null,

      vendorName: normalizeNullableString(vendorName),
      amount,
      expenseDate: dateStringToTimestamp(expenseDate),
      notes: normalizeNullableString(notes),

      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "EXPENSE_UPDATED",
    module: "expense",
    entityId: id,
    entityType: "expense",
    oldValue: {
      expenseNumber: oldExpense.expenseNumber,
      title: oldExpense.title,
      category: oldExpense.category,
      projectId: oldExpense.projectId,
      amount: oldExpense.amount,
      status: oldExpense.status,
    },
    newValue: {
      expenseNumber: normalizedExpenseNumber,
      title: expenseTitle,
      category,
      projectId: project?.id ?? null,
      amount,
      status: oldExpense.status,
    },
  });

  return getExpenseByIdService(id);
}

export async function submitExpenseService({
  actor,
  id,
}: ExpenseIdParams): Promise<ExpenseDetail> {
  const oldExpense = await getExpenseByIdService(id);

  if (oldExpense.status !== "DRAFT" && oldExpense.status !== "REJECTED") {
    throw new AppError(
      "Hanya expense DRAFT atau REJECTED yang bisa disubmit.",
      400,
      "EXPENSE_NOT_SUBMITTABLE",
    );
  }

  await getDb().collection(COLLECTIONS.expenses).doc(id).update({
    status: "SUBMITTED",
    rejectedReason: null,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "EXPENSE_SUBMITTED",
    module: "expense",
    entityId: id,
    entityType: "expense",
    oldValue: { status: oldExpense.status },
    newValue: { status: "SUBMITTED" },
  });

  return getExpenseByIdService(id);
}

export async function approveExpenseService({
  actor,
  id,
}: ExpenseIdParams): Promise<ExpenseDetail> {
  const oldExpense = await getExpenseByIdService(id);

  if (oldExpense.status !== "SUBMITTED") {
    throw new AppError(
      "Hanya expense SUBMITTED yang bisa di-approve.",
      400,
      "EXPENSE_NOT_SUBMITTED",
    );
  }

  await getDb().collection(COLLECTIONS.expenses).doc(id).update({
    status: "APPROVED",
    approvedByUserId: actor.uid,
    approvedByName: actor.name,
    rejectedReason: null,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "EXPENSE_APPROVED",
    module: "expense",
    entityId: id,
    entityType: "expense",
    oldValue: { status: oldExpense.status },
    newValue: {
      status: "APPROVED",
      approvedByUserId: actor.uid,
      approvedByName: actor.name,
    },
  });

  return getExpenseByIdService(id);
}

export async function rejectExpenseService({
  actor,
  id,
  reason,
}: RejectExpenseParams): Promise<ExpenseDetail> {
  const oldExpense = await getExpenseByIdService(id);

  if (oldExpense.status !== "SUBMITTED") {
    throw new AppError(
      "Hanya expense SUBMITTED yang bisa di-reject.",
      400,
      "EXPENSE_NOT_SUBMITTED",
    );
  }

  await getDb().collection(COLLECTIONS.expenses).doc(id).update({
    status: "REJECTED",
    rejectedReason: reason.trim(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "EXPENSE_REJECTED",
    module: "expense",
    entityId: id,
    entityType: "expense",
    oldValue: { status: oldExpense.status },
    newValue: {
      status: "REJECTED",
      rejectedReason: reason.trim(),
    },
  });

  return getExpenseByIdService(id);
}

export async function markExpensePaidService({
  actor,
  id,
}: ExpenseIdParams): Promise<ExpenseDetail> {
  const oldExpense = await getExpenseByIdService(id);

  if (oldExpense.status !== "APPROVED") {
    throw new AppError(
      "Hanya expense APPROVED yang bisa ditandai paid.",
      400,
      "EXPENSE_NOT_APPROVED",
    );
  }

  await getDb().collection(COLLECTIONS.expenses).doc(id).update({
    status: "PAID",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "EXPENSE_MARKED_PAID",
    module: "expense",
    entityId: id,
    entityType: "expense",
    oldValue: { status: oldExpense.status, paidAt: oldExpense.paidAt },
    newValue: { status: "PAID", paidAt: "SERVER_TIMESTAMP" },
  });

  return getExpenseByIdService(id);
}

export async function deleteExpenseService({
  actor,
  id,
}: ExpenseIdParams): Promise<ExpenseDetail> {
  const oldExpense = await getExpenseByIdService(id);

  if (oldExpense.status === "PAID") {
    throw new AppError(
      "Expense PAID tidak bisa dihapus.",
      400,
      "EXPENSE_PAID_DELETE_BLOCKED",
    );
  }

  await getDb().collection(COLLECTIONS.expenses).doc(id).update({
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "EXPENSE_DELETED",
    module: "expense",
    entityId: id,
    entityType: "expense",
    oldValue: {
      expenseNumber: oldExpense.expenseNumber,
      status: oldExpense.status,
      deletedAt: oldExpense.deletedAt,
    },
    newValue: {
      deletedAt: "SERVER_TIMESTAMP",
    },
  });

  return {
    ...oldExpense,
    deletedAt: new Date(),
  };
}
