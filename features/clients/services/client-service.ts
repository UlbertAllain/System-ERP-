import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { deleteCloudinaryImage } from "@/lib/cloudinary/server";
import type { ImageAsset } from "@/types/common";
import type { PaginatedResult } from "@/types/common";
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
  ClientDetail,
  ClientListItem,
  ClientStatus,
} from "@/types/client";

import {
  timestampToDate,
  normalizeNullableString,
  normalizeSearchText,
} from "@/lib/domain/firestore-value";
type CreateClientParams = {
  actor: CurrentUser;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  address?: string | null;
  notes?: string | null;
};

type UpdateClientParams = CreateClientParams & {
  id: string;
  status: ClientStatus;
};
type UpdateClientLogoParams = {
  actor: CurrentUser;
  id: string;
  logo: ImageAsset;
};

type ClientIdParams = {
  actor: CurrentUser;
  id: string;
};

type ListClientsPaginatedParams = {
  search?: string;
  status?: ClientStatus;
  page: number;
  pageSize: number;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeClientDocument(
  id: string,
  data: DocumentData,
): ClientListItem {
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

async function assertClientEmailUnique(
  email: string,
  ignoredClientId?: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  const querySnap = await getDb()
    .collection(COLLECTIONS.clients)
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (querySnap.empty) {
    return;
  }

  const existingDoc = querySnap.docs[0];

  if (existingDoc.id !== ignoredClientId) {
    throw new AppError(
      "Email client sudah digunakan.",
      409,
      "CLIENT_EMAIL_ALREADY_USED",
    );
  }
}

async function getClientDocumentOrThrow(id: string): Promise<ClientDetail> {
  const clientSnap = await getDb()
    .collection(COLLECTIONS.clients)
    .doc(id)
    .get();

  if (!clientSnap.exists) {
    throw new AppError("Client tidak ditemukan.", 404, "CLIENT_NOT_FOUND");
  }

  return normalizeClientDocument(clientSnap.id, clientSnap.data() ?? {});
}

export async function listClientsService(): Promise<ClientListItem[]> {
  const querySnap = await getDb()
    .collection(COLLECTIONS.clients)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => normalizeClientDocument(doc.id, doc.data()))
    .filter((client) => client.deletedAt === null);
}

export async function listClientsPaginatedService({
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

export async function getClientByIdService(id: string): Promise<ClientDetail> {
  const client = await getClientDocumentOrThrow(id);

  if (client.deletedAt) {
    throw new AppError("Client sudah dihapus.", 404, "CLIENT_DELETED");
  }

  return client;
}

export async function createClientService({
  actor,
  name,
  email,
  phone,
  company,
  website,
  address,
  notes,
}: CreateClientParams): Promise<ClientDetail> {
  const normalizedEmail = normalizeEmail(email);

  await assertClientEmailUnique(normalizedEmail);

  const clientId = createDocumentId("clients");

  await getDb()
    .collection(COLLECTIONS.clients)
    .doc(clientId)
    .set({
      id: clientId,
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizeNullableString(phone),
      company: normalizeNullableString(company),
      website: normalizeNullableString(website),
      address: normalizeNullableString(address),
      logo: null,
      status: "ACTIVE",
      searchText: normalizeSearchText(name, email, company, phone),
      notes: normalizeNullableString(notes),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });

  await writeAuditLog({
    user: actor,
    action: "CLIENT_CREATED",
    module: "client",
    entityId: clientId,
    entityType: "client",
    oldValue: null,
    newValue: {
      id: clientId,
      name: name.trim(),
      email: normalizedEmail,
      company: normalizeNullableString(company),
      status: "ACTIVE",
    },
  });

  return getClientByIdService(clientId);
}

export async function updateClientService({
  actor,
  id,
  name,
  email,
  phone,
  company,
  website,
  address,
  status,
  notes,
}: UpdateClientParams): Promise<ClientDetail> {
  const oldClient = await getClientByIdService(id);
  const normalizedEmail = normalizeEmail(email);

  await assertClientEmailUnique(normalizedEmail, id);

  await getDb()
    .collection(COLLECTIONS.clients)
    .doc(id)
    .update({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizeNullableString(phone),
      company: normalizeNullableString(company),
      website: normalizeNullableString(website),
      address: normalizeNullableString(address),
      status,
      searchText: normalizeSearchText(name, email, company, phone),
      notes: normalizeNullableString(notes),
      updatedAt: serverTimestamp(),
    });

  await writeAuditLog({
    user: actor,
    action: "CLIENT_UPDATED",
    module: "client",
    entityId: id,
    entityType: "client",
    oldValue: {
      name: oldClient.name,
      email: oldClient.email,
      company: oldClient.company,
      status: oldClient.status,
    },
    newValue: {
      name: name.trim(),
      email: normalizedEmail,
      company: normalizeNullableString(company),
      status,
    },
  });

  return getClientByIdService(id);
}

export async function updateClientLogoService({
  actor,
  id,
  logo,
}: UpdateClientLogoParams): Promise<ClientDetail> {
  const oldClient = await getClientByIdService(id);

  await getDb().collection(COLLECTIONS.clients).doc(id).update({
    logo,
    updatedAt: serverTimestamp(),
  });

  if (oldClient.logo?.publicId && oldClient.logo.publicId !== logo.publicId) {
    await deleteCloudinaryImage(oldClient.logo.publicId);
  }

  await writeAuditLog({
    user: actor,
    action: "CLIENT_LOGO_UPDATED",
    module: "client",
    entityId: id,
    entityType: "client",
    oldValue: {
      logo: oldClient.logo,
    },
    newValue: {
      logo,
    },
  });

  return getClientByIdService(id);
}

export async function deleteClientService({
  actor,
  id,
}: ClientIdParams): Promise<ClientDetail> {
  const oldClient = await getClientByIdService(id);

  await getDb().collection(COLLECTIONS.clients).doc(id).update({
    status: "ARCHIVED",
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "CLIENT_DELETED",
    module: "client",
    entityId: id,
    entityType: "client",
    oldValue: {
      status: oldClient.status,
      deletedAt: oldClient.deletedAt,
    },
    newValue: {
      status: "ARCHIVED",
      deletedAt: "SERVER_TIMESTAMP",
    },
  });

  return {
    ...oldClient,
    status: "ARCHIVED",
    deletedAt: new Date(),
  };
}

export async function restoreClientService({
  actor,
  id,
}: ClientIdParams): Promise<ClientDetail> {
  const clientSnap = await getDb()
    .collection(COLLECTIONS.clients)
    .doc(id)
    .get();

  if (!clientSnap.exists) {
    throw new AppError("Client tidak ditemukan.", 404, "CLIENT_NOT_FOUND");
  }

  const oldClient = normalizeClientDocument(
    clientSnap.id,
    clientSnap.data() ?? {},
  );

  await getDb().collection(COLLECTIONS.clients).doc(id).update({
    status: "ACTIVE",
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    user: actor,
    action: "CLIENT_RESTORED",
    module: "client",
    entityId: id,
    entityType: "client",
    oldValue: {
      status: oldClient.status,
      deletedAt: oldClient.deletedAt,
    },
    newValue: {
      status: "ACTIVE",
      deletedAt: null,
    },
  });

  return getClientByIdService(id);
}
