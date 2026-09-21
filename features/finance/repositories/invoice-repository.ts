import "server-only";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import type { PaginatedResult } from "@/types/common";
import type {
  InvoiceDetail,
  InvoiceListItem,
  InvoiceStatus,
} from "@/types/invoice";
import {
  normalizeInvoiceDocument,
  toInvoiceListItem,
} from "@/modules/finance/invoices/invoice-mapper";

export type ListInvoicesRepositoryParams = {
  clientId?: string;
  projectId?: string;
  status?: InvoiceStatus;
};

export type ListInvoicesPaginatedRepositoryParams =
  ListInvoicesRepositoryParams & {
    search?: string;
    page: number;
    pageSize: number;
  };


export type DateRangeRepositoryParams = {
  from?: Date | null;
  to?: Date | null;
};

export async function listInvoicesByIssueDateRange({
  from,
  to,
}: DateRangeRepositoryParams): Promise<InvoiceListItem[]> {
  let query: FirebaseFirestore.Query = getDb().collection(COLLECTIONS.invoices);

  if (from) {
    query = query.where("issueDate", ">=", from);
  }

  if (to) {
    query = query.where("issueDate", "<=", to);
  }

  const querySnap = await query.orderBy("issueDate", "desc").get();

  return querySnap.docs
    .map((doc) => normalizeInvoiceDocument(doc.id, doc.data()))
    .filter((invoice) => invoice.deletedAt === null)
    .map(toInvoiceListItem);
}

export async function findInvoiceById(
  id: string,
): Promise<InvoiceDetail | null> {
  const invoiceSnap = await getDb()
    .collection(COLLECTIONS.invoices)
    .doc(id)
    .get();

  if (!invoiceSnap.exists) {
    return null;
  }

  return normalizeInvoiceDocument(invoiceSnap.id, invoiceSnap.data() ?? {});
}

export async function listInvoices(
  {
    clientId,
    projectId,
    status,
  }: ListInvoicesRepositoryParams = {},
): Promise<InvoiceListItem[]> {
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

export async function listInvoicesPaginated({
  search,
  clientId,
  projectId,
  status,
  page,
  pageSize,
}: ListInvoicesPaginatedRepositoryParams): Promise<
  PaginatedResult<InvoiceListItem>
> {
  const normalizedSearch = search?.trim().toLowerCase();
  const collection = getDb().collection(COLLECTIONS.invoices);
  const offset = (page - 1) * pageSize;

  if (normalizedSearch) {
    const querySnap = await collection
      .orderBy("searchText")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .get();

    const matchedInvoices = querySnap.docs
      .map((doc) => normalizeInvoiceDocument(doc.id, doc.data()))
      .filter((invoice) => invoice.deletedAt === null)
      .filter((invoice) => {
        if (clientId && invoice.clientId !== clientId) return false;
        if (projectId && invoice.projectId !== projectId) return false;
        if (status && invoice.status !== status) return false;

        return true;
      })
      .map(toInvoiceListItem);

    const totalItems = matchedInvoices.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items: matchedInvoices.slice(offset, offset + pageSize),
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

  if (clientId) {
    baseQuery = baseQuery.where("clientId", "==", clientId);
  }

  if (projectId) {
    baseQuery = baseQuery.where("projectId", "==", projectId);
  }

  if (status) {
    baseQuery = baseQuery.where("status", "==", status);
  }

  const countSnap = await baseQuery.count().get();
  const totalItems = countSnap.data().count;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

  const querySnap = await baseQuery
    .orderBy("createdAt", "desc")
    .offset(offset)
    .limit(pageSize)
    .get();

  return {
    items: querySnap.docs.map((doc) =>
      toInvoiceListItem(normalizeInvoiceDocument(doc.id, doc.data())),
    ),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}
