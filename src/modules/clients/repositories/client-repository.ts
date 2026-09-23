import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import type { ImageAsset, PaginatedResult } from "@/types/common";
import type {
  ClientDetail,
  ClientListItem,
  ClientStatus,
} from "@/types/client";
import {
  COLLECTIONS,
  createDocumentId,
  getDb,
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { timestampToDate } from "@/lib/domain/firestore-value";

type ListClientsPaginatedParams = {
  search?: string;
  status?: ClientStatus;
  page: number;
  pageSize: number;
};

type CreateClientRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  website: string | null;
  address: string | null;
  logo: ImageAsset | null;
  status: ClientStatus;
  searchText: string;
  notes: string | null;
};

type UpdateClientRecord = Omit<CreateClientRecord, "id" | "logo">;

function normalizeClientDocument(
  id: string,
  data: DocumentData,
): ClientDetail {
  return {
    id,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: data.phone ?? null,
    company: data.company ?? null,
    website: data.website ?? null,
    address: data.address ?? null,
    logo: data.logo ?? null,
    status: data.status as ClientStatus,
    notes: data.notes ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    deletedAt: timestampToDate(data.deletedAt),
  };
}

export function createClientDocumentId(): string {
  return createDocumentId("clients");
}

export async function findClientById(
  id: string,
): Promise<ClientDetail | null> {
  const clientSnap = await getDb()
    .collection(COLLECTIONS.clients)
    .doc(id)
    .get();

  if (!clientSnap.exists) {
    return null;
  }

  return normalizeClientDocument(clientSnap.id, clientSnap.data() ?? {});
}

export async function findClientByEmail(
  email: string,
): Promise<ClientDetail | null> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.clients)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (querySnap.empty) {
    return null;
  }

  const clientDoc = querySnap.docs[0];

  return normalizeClientDocument(clientDoc.id, clientDoc.data());
}

export async function listClients(): Promise<ClientListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.clients)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeClientDocument(doc.id, doc.data()))
    .filter((client) => client.deletedAt === null);
}

export async function listClientsPaginated({
  search,
  status,
  page,
  pageSize,
}: ListClientsPaginatedParams): Promise<PaginatedResult<ClientListItem>> {
  const normalizedSearch = search?.trim().toLowerCase();
  const collection = getDb().collection(COLLECTIONS.clients);
  const offset = (page - 1) * pageSize;

  if (normalizedSearch) {
    const querySnap = await collection
      .orderBy("searchText")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .get();

    const matchedClients = querySnap.docs
      .map((doc) => normalizeClientDocument(doc.id, doc.data()))
      .filter((client) => client.deletedAt === null)
      .filter((client) => (status ? client.status === status : true));

    const totalItems = matchedClients.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items: matchedClients.slice(offset, offset + pageSize),
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
      normalizeClientDocument(doc.id, doc.data()),
    ),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}

export async function insertClient(
  client: CreateClientRecord,
): Promise<void> {
  await getDb()
    .collection(COLLECTIONS.clients)
    .doc(client.id)
    .set({
      ...client,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });
}

export async function updateClient(
  id: string,
  client: UpdateClientRecord,
): Promise<void> {
  await getDb()
    .collection(COLLECTIONS.clients)
    .doc(id)
    .update({
      ...client,
      updatedAt: serverTimestamp(),
    });
}

export async function updateClientLogo(
  id: string,
  logo: ImageAsset,
): Promise<void> {
  await getDb().collection(COLLECTIONS.clients).doc(id).update({
    logo,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveClient(id: string): Promise<void> {
  await getDb().collection(COLLECTIONS.clients).doc(id).update({
    status: "ARCHIVED",
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreClient(id: string): Promise<void> {
  await getDb().collection(COLLECTIONS.clients).doc(id).update({
    status: "ACTIVE",
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}
