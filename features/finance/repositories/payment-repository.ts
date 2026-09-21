import "server-only";

import { COLLECTIONS, getDb } from "@/lib/firebase/firestore";
import type { PaginatedResult } from "@/types/common";
import type {
  PaymentDetail,
  PaymentListItem,
  PaymentMethod,
  PaymentStatus,
} from "@/types/payment";
import { normalizePaymentDocument } from "@/modules/finance/payments/payment-mapper";

export type ListPaymentsRepositoryParams = {
  invoiceId?: string;
  clientId?: string;
  projectId?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
};

export type ListPaymentsPaginatedRepositoryParams =
  ListPaymentsRepositoryParams & {
    search?: string;
    page: number;
    pageSize: number;
  };

export async function findPaymentById(
  id: string,
): Promise<PaymentDetail | null> {
  const paymentSnap = await getDb()
    .collection(COLLECTIONS.payments)
    .doc(id)
    .get();

  if (!paymentSnap.exists) {
    return null;
  }

  return normalizePaymentDocument(paymentSnap.id, paymentSnap.data() ?? {});
}

export async function listPayments(
  {
    invoiceId,
    clientId,
    projectId,
    method,
    status,
  }: ListPaymentsRepositoryParams = {},
): Promise<PaymentListItem[]> {
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

export async function listPaymentsPaginated({
  search,
  invoiceId,
  clientId,
  projectId,
  method,
  status,
  page,
  pageSize,
}: ListPaymentsPaginatedRepositoryParams): Promise<
  PaginatedResult<PaymentListItem>
> {
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
