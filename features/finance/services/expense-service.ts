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
  ExpenseCategory,
  ExpenseDetail,
  ExpenseListItem,
  ExpenseStatus,
} from "@/types/expense";

import {
  normalizeNullableString,
  normalizeSearchText,
  dateStringToTimestamp,
} from "@/lib/domain/firestore-value";
import {
  normalizeExpenseAmount,
  getExpenseNumberLockId,
  normalizeExpenseNumber,
} from "@/modules/finance/expenses/expense-domain";
import { normalizeExpenseDocument } from "@/modules/finance/expenses/expense-mapper";

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

type ListExpensesPaginatedParams = ListExpensesParams & {
  search?: string;
  page: number;
  pageSize: number;
};

type ProjectSnapshot = {
  id: string;
  name: string;
  projectCode: string;
};

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

function normalizeProjectSnapshotOrThrow(
  projectSnap: DocumentSnapshot<DocumentData>,
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

  return {
    id: projectSnap.id,
    name: String(project.name ?? ""),
    projectCode: String(project.projectCode ?? ""),
  };
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

export async function listExpensesPaginatedService({
  search,
  projectId,
  status,
  category,
  page,
  pageSize,
}: ListExpensesPaginatedParams): Promise<PaginatedResult<ExpenseListItem>> {
  const normalizedSearch = search?.trim().toLowerCase();
  const collection = getDb().collection(COLLECTIONS.expenses);
  const offset = (page - 1) * pageSize;

  if (normalizedSearch) {
    const querySnap = await collection
      .orderBy("searchText")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .get();

    const matchedExpenses = querySnap.docs
      .map((doc) => normalizeExpenseDocument(doc.id, doc.data()))
      .filter((expense) => expense.deletedAt === null)
      .filter((expense) => {
        if (projectId && expense.projectId !== projectId) return false;
        if (status && expense.status !== status) return false;
        if (category && expense.category !== category) return false;

        return true;
      });
    const totalItems = matchedExpenses.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items: matchedExpenses.slice(offset, offset + pageSize),
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

  if (projectId) {
    baseQuery = baseQuery.where("projectId", "==", projectId);
  }

  if (status) {
    baseQuery = baseQuery.where("status", "==", status);
  }

  if (category) {
    baseQuery = baseQuery.where("category", "==", category);
  }

  const countSnap = await baseQuery.count().get();
  const totalItems = countSnap.data().count;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const querySnap = await baseQuery
    .orderBy("expenseDate", "desc")
    .offset(offset)
    .limit(pageSize)
    .get();

  return {
    items: querySnap.docs.map((doc) =>
      normalizeExpenseDocument(doc.id, doc.data()),
    ),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
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
  const normalizedAmount = normalizeExpenseAmount(amount);
  await assertExpenseNumberUnique(normalizedExpenseNumber);

  const db = getDb();
  const expenseId = createDocumentId("expenses");
  const expenseRef = db.collection(COLLECTIONS.expenses).doc(expenseId);
  const lockRef = db
    .collection(COLLECTIONS.expenseNumberLocks)
    .doc(getExpenseNumberLockId(normalizedExpenseNumber));
  const projectRef = projectId
    ? db.collection(COLLECTIONS.projects).doc(projectId)
    : null;
  const expenseTitle = title.trim();

  await db.runTransaction(async (transaction) => {
    const [lockSnap, projectSnap] = await Promise.all([
      transaction.get(lockRef),
      projectRef ? transaction.get(projectRef) : Promise.resolve(null),
    ]);

    if (lockSnap.exists) {
      throw new AppError(
        "Nomor pengeluaran sudah digunakan.",
        409,
        "EXPENSE_NUMBER_ALREADY_USED",
      );
    }

    const project = projectSnap
      ? normalizeProjectSnapshotOrThrow(projectSnap)
      : null;
    const auditLog = getAuditLogDocument({
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
        amount: normalizedAmount,
        status: "DRAFT",
      },
    });

    transaction.set(expenseRef, {
      id: expenseId,
      expenseNumber: normalizedExpenseNumber,
      title: expenseTitle,
      description: normalizeNullableString(description),
      category,
      status: "DRAFT",
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectCode: project?.projectCode ?? null,
      searchText: normalizeSearchText(
        normalizedExpenseNumber,
        expenseTitle,
        category,
        project?.name,
        project?.projectCode,
        normalizeNullableString(vendorName),
        actor.name,
      ),
      vendorName: normalizeNullableString(vendorName),
      amount: normalizedAmount,
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
    transaction.set(lockRef, {
      expenseId,
      expenseNumber: normalizedExpenseNumber,
      createdAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
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
  const normalizedExpenseNumber = normalizeExpenseNumber(expenseNumber);
  const normalizedAmount = normalizeExpenseAmount(amount);
  await assertExpenseNumberUnique(normalizedExpenseNumber, id);

  const db = getDb();
  const expenseRef = db.collection(COLLECTIONS.expenses).doc(id);
  const projectRef = projectId
    ? db.collection(COLLECTIONS.projects).doc(projectId)
    : null;
  const expenseTitle = title.trim();

  await db.runTransaction(async (transaction) => {
    const expenseSnap = await transaction.get(expenseRef);

    if (!expenseSnap.exists) {
      throw new AppError("Expense tidak ditemukan.", 404, "EXPENSE_NOT_FOUND");
    }

    const oldExpense = normalizeExpenseDocument(
      expenseSnap.id,
      expenseSnap.data() ?? {},
    );

    if (oldExpense.deletedAt) {
      throw new AppError("Expense sudah dihapus.", 404, "EXPENSE_DELETED");
    }

    if (!(["DRAFT", "REJECTED"] as ExpenseStatus[]).includes(oldExpense.status)) {
      throw new AppError(
        "Hanya pengeluaran DRAFT atau REJECTED yang dapat diubah.",
        409,
        "EXPENSE_CONTENT_LOCKED",
      );
    }

    const numberChanged = oldExpense.expenseNumber !== normalizedExpenseNumber;
    const newLockRef = db
      .collection(COLLECTIONS.expenseNumberLocks)
      .doc(getExpenseNumberLockId(normalizedExpenseNumber));
    const oldLockRef = db
      .collection(COLLECTIONS.expenseNumberLocks)
      .doc(getExpenseNumberLockId(oldExpense.expenseNumber));
    const [newLockSnap, oldLockSnap, projectSnap] = await Promise.all([
      transaction.get(newLockRef),
      numberChanged ? transaction.get(oldLockRef) : Promise.resolve(null),
      projectRef ? transaction.get(projectRef) : Promise.resolve(null),
    ]);

    if (
      newLockSnap.exists &&
      String(newLockSnap.data()?.expenseId ?? "") !== id
    ) {
      throw new AppError(
        "Nomor pengeluaran sudah digunakan.",
        409,
        "EXPENSE_NUMBER_ALREADY_USED",
      );
    }

    const project = projectSnap
      ? normalizeProjectSnapshotOrThrow(projectSnap)
      : null;

    transaction.update(expenseRef, {
      expenseNumber: normalizedExpenseNumber,
      title: expenseTitle,
      description: normalizeNullableString(description),
      category,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectCode: project?.projectCode ?? null,
      searchText: normalizeSearchText(
        normalizedExpenseNumber,
        expenseTitle,
        category,
        project?.name,
        project?.projectCode,
        normalizeNullableString(vendorName),
        oldExpense.createdByName,
      ),
      vendorName: normalizeNullableString(vendorName),
      amount: normalizedAmount,
      expenseDate: dateStringToTimestamp(expenseDate),
      notes: normalizeNullableString(notes),
      updatedAt: serverTimestamp(),
    });

    if (numberChanged || !newLockSnap.exists) {
      transaction.set(newLockRef, {
        expenseId: id,
        expenseNumber: normalizedExpenseNumber,
        createdAt: serverTimestamp(),
      });
    }

    if (
      numberChanged &&
      oldLockSnap?.exists &&
      String(oldLockSnap.data()?.expenseId ?? "") === id
    ) {
      transaction.delete(oldLockRef);
    }

    const auditLog = getAuditLogDocument({
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
        amount: normalizedAmount,
        status: oldExpense.status,
      },
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getExpenseByIdService(id);
}

export async function submitExpenseService({
  actor,
  id,
}: ExpenseIdParams): Promise<ExpenseDetail> {
  const db = getDb();
  const expenseRef = db.collection(COLLECTIONS.expenses).doc(id);

  await db.runTransaction(async (transaction) => {
    const expenseSnap = await transaction.get(expenseRef);

    if (!expenseSnap.exists) {
      throw new AppError("Expense tidak ditemukan.", 404, "EXPENSE_NOT_FOUND");
    }

    const oldExpense = normalizeExpenseDocument(
      expenseSnap.id,
      expenseSnap.data() ?? {},
    );

    if (oldExpense.deletedAt) {
      throw new AppError("Expense sudah dihapus.", 404, "EXPENSE_DELETED");
    }

    if (oldExpense.status !== "DRAFT" && oldExpense.status !== "REJECTED") {
      throw new AppError(
        "Hanya pengeluaran DRAFT atau REJECTED yang dapat diajukan.",
        409,
        "EXPENSE_NOT_SUBMITTABLE",
      );
    }

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "EXPENSE_SUBMITTED",
      module: "expense",
      entityId: id,
      entityType: "expense",
      oldValue: { status: oldExpense.status },
      newValue: { status: "SUBMITTED" },
    });

    transaction.update(expenseRef, {
      status: "SUBMITTED",
      rejectedReason: null,
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getExpenseByIdService(id);
}

export async function approveExpenseService({
  actor,
  id,
}: ExpenseIdParams): Promise<ExpenseDetail> {
  const db = getDb();
  const expenseRef = db.collection(COLLECTIONS.expenses).doc(id);

  await db.runTransaction(async (transaction) => {
    const expenseSnap = await transaction.get(expenseRef);

    if (!expenseSnap.exists) {
      throw new AppError("Expense tidak ditemukan.", 404, "EXPENSE_NOT_FOUND");
    }

    const oldExpense = normalizeExpenseDocument(
      expenseSnap.id,
      expenseSnap.data() ?? {},
    );

    if (oldExpense.deletedAt) {
      throw new AppError("Expense sudah dihapus.", 404, "EXPENSE_DELETED");
    }

    if (oldExpense.status !== "SUBMITTED") {
      throw new AppError(
        "Hanya pengeluaran SUBMITTED yang dapat disetujui.",
        409,
        "EXPENSE_NOT_SUBMITTED",
      );
    }

    if (oldExpense.createdByUserId === actor.uid) {
      throw new AppError(
        "Pembuat pengeluaran tidak boleh menyetujui pengeluarannya sendiri.",
        409,
        "EXPENSE_SELF_APPROVAL_BLOCKED",
      );
    }

    const auditLog = getAuditLogDocument({
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

    transaction.update(expenseRef, {
      status: "APPROVED",
      approvedByUserId: actor.uid,
      approvedByName: actor.name,
      rejectedReason: null,
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getExpenseByIdService(id);
}

export async function rejectExpenseService({
  actor,
  id,
  reason,
}: RejectExpenseParams): Promise<ExpenseDetail> {
  const rejectionReason = reason.trim();
  const db = getDb();
  const expenseRef = db.collection(COLLECTIONS.expenses).doc(id);

  await db.runTransaction(async (transaction) => {
    const expenseSnap = await transaction.get(expenseRef);

    if (!expenseSnap.exists) {
      throw new AppError("Expense tidak ditemukan.", 404, "EXPENSE_NOT_FOUND");
    }

    const oldExpense = normalizeExpenseDocument(
      expenseSnap.id,
      expenseSnap.data() ?? {},
    );

    if (oldExpense.deletedAt) {
      throw new AppError("Expense sudah dihapus.", 404, "EXPENSE_DELETED");
    }

    if (oldExpense.status !== "SUBMITTED") {
      throw new AppError(
        "Hanya pengeluaran SUBMITTED yang dapat ditolak.",
        409,
        "EXPENSE_NOT_SUBMITTED",
      );
    }

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "EXPENSE_REJECTED",
      module: "expense",
      entityId: id,
      entityType: "expense",
      oldValue: { status: oldExpense.status },
      newValue: {
        status: "REJECTED",
        rejectedReason: rejectionReason,
      },
    });

    transaction.update(expenseRef, {
      status: "REJECTED",
      approvedByUserId: null,
      approvedByName: null,
      rejectedReason: rejectionReason,
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getExpenseByIdService(id);
}

export async function markExpensePaidService({
  actor,
  id,
}: ExpenseIdParams): Promise<ExpenseDetail> {
  const db = getDb();
  const expenseRef = db.collection(COLLECTIONS.expenses).doc(id);

  await db.runTransaction(async (transaction) => {
    const expenseSnap = await transaction.get(expenseRef);

    if (!expenseSnap.exists) {
      throw new AppError("Expense tidak ditemukan.", 404, "EXPENSE_NOT_FOUND");
    }

    const oldExpense = normalizeExpenseDocument(
      expenseSnap.id,
      expenseSnap.data() ?? {},
    );

    if (oldExpense.deletedAt) {
      throw new AppError("Expense sudah dihapus.", 404, "EXPENSE_DELETED");
    }

    if (oldExpense.status !== "APPROVED") {
      throw new AppError(
        "Hanya pengeluaran APPROVED yang dapat ditandai dibayar.",
        409,
        "EXPENSE_NOT_APPROVED",
      );
    }

    const auditLog = getAuditLogDocument({
      user: actor,
      action: "EXPENSE_MARKED_PAID",
      module: "expense",
      entityId: id,
      entityType: "expense",
      oldValue: { status: oldExpense.status, paidAt: oldExpense.paidAt },
      newValue: { status: "PAID", paidAt: "SERVER_TIMESTAMP" },
    });

    transaction.update(expenseRef, {
      status: "PAID",
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditLog.ref, auditLog.data);
  });

  return getExpenseByIdService(id);
}

export async function deleteExpenseService({
  actor,
  id,
}: ExpenseIdParams): Promise<ExpenseDetail> {
  const db = getDb();
  const expenseRef = db.collection(COLLECTIONS.expenses).doc(id);
  const deletedExpense = await db.runTransaction(async (transaction) => {
    const expenseSnap = await transaction.get(expenseRef);

    if (!expenseSnap.exists) {
      throw new AppError("Expense tidak ditemukan.", 404, "EXPENSE_NOT_FOUND");
    }

    const oldExpense = normalizeExpenseDocument(
      expenseSnap.id,
      expenseSnap.data() ?? {},
    );

    if (oldExpense.deletedAt) {
      throw new AppError("Expense sudah dihapus.", 404, "EXPENSE_DELETED");
    }

    if (oldExpense.status !== "DRAFT" && oldExpense.status !== "REJECTED") {
      throw new AppError(
        "Hanya pengeluaran DRAFT atau REJECTED yang dapat dihapus.",
        409,
        "EXPENSE_DELETE_BLOCKED",
      );
    }

    const lockRef = db
      .collection(COLLECTIONS.expenseNumberLocks)
      .doc(getExpenseNumberLockId(oldExpense.expenseNumber));
    const lockSnap = await transaction.get(lockRef);
    const auditLog = getAuditLogDocument({
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
      newValue: { deletedAt: "SERVER_TIMESTAMP" },
    });

    transaction.update(expenseRef, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (
      lockSnap.exists &&
      String(lockSnap.data()?.expenseId ?? "") === id
    ) {
      transaction.delete(lockRef);
    }

    transaction.set(auditLog.ref, auditLog.data);
    return oldExpense;
  });

  return {
    ...deletedExpense,
    deletedAt: new Date(),
  };
}
