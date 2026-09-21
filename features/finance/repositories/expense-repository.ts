import "server-only";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import type { PaginatedResult } from "@/types/common";
import type {
  ExpenseCategory,
  ExpenseDetail,
  ExpenseListItem,
  ExpenseStatus,
} from "@/types/expense";
import { normalizeExpenseDocument } from "@/modules/finance/expenses/expense-mapper";

export type ListExpensesRepositoryParams = {
  projectId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
};

export type ListExpensesPaginatedRepositoryParams =
  ListExpensesRepositoryParams & {
    search?: string;
    page: number;
    pageSize: number;
  };

export async function findExpenseById(
  id: string,
): Promise<ExpenseDetail | null> {
  const expenseSnap = await getDb()
    .collection(COLLECTIONS.expenses)
    .doc(id)
    .get();

  if (!expenseSnap.exists) {
    return null;
  }

  return normalizeExpenseDocument(expenseSnap.id, expenseSnap.data() ?? {});
}

export async function listExpenses(
  {
    projectId,
    status,
    category,
  }: ListExpensesRepositoryParams = {},
): Promise<ExpenseListItem[]> {
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

export async function listExpensesPaginated({
  search,
  projectId,
  status,
  category,
  page,
  pageSize,
}: ListExpensesPaginatedRepositoryParams): Promise<
  PaginatedResult<ExpenseListItem>
> {
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
