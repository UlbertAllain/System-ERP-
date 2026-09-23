import "server-only";

import { deleteCloudinaryImage } from "@/lib/cloudinary/server";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import {
  normalizeNullableString,
  normalizeSearchText,
} from "@/lib/domain/firestore-value";
import type { ImageAsset, PaginatedResult } from "@/types/common";
import type { CurrentUser } from "@/types/auth";
import type {
  ClientDetail,
  ClientListItem,
  ClientStatus,
} from "@/types/client";
import {
  archiveClient,
  createClientDocumentId,
  findClientByEmail,
  findClientById,
  insertClient,
  listClients,
  listClientsPaginated,
  restoreClient,
  updateClient,
  updateClientLogo,
} from "@/modules/clients/repositories/client-repository";

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

async function assertClientEmailUnique(
  email: string,
  ignoredClientId?: string,
): Promise<void> {
  const existingClient = await findClientByEmail(normalizeEmail(email));

  if (!existingClient || existingClient.id === ignoredClientId) {
    return;
  }

  throw new AppError(
    "Email client sudah digunakan.",
    409,
    "CLIENT_EMAIL_ALREADY_USED",
  );
}

async function getClientDocumentOrThrow(id: string): Promise<ClientDetail> {
  const client = await findClientById(id);

  if (!client) {
    throw new AppError("Client tidak ditemukan.", 404, "CLIENT_NOT_FOUND");
  }

  return client;
}

export async function listClientsService(): Promise<ClientListItem[]> {
  return listClients();
}

export async function listClientsPaginatedService(
  input: ListClientsPaginatedParams,
): Promise<PaginatedResult<ClientListItem>> {
  return listClientsPaginated(input);
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

  const clientId = createClientDocumentId();
  const normalizedCompany = normalizeNullableString(company);

  await insertClient({
    id: clientId,
    name: name.trim(),
    email: normalizedEmail,
    phone: normalizeNullableString(phone),
    company: normalizedCompany,
    website: normalizeNullableString(website),
    address: normalizeNullableString(address),
    logo: null,
    status: "ACTIVE",
    searchText: normalizeSearchText(name, email, company, phone),
    notes: normalizeNullableString(notes),
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
      company: normalizedCompany,
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
  const normalizedCompany = normalizeNullableString(company);

  await assertClientEmailUnique(normalizedEmail, id);

  await updateClient(id, {
    name: name.trim(),
    email: normalizedEmail,
    phone: normalizeNullableString(phone),
    company: normalizedCompany,
    website: normalizeNullableString(website),
    address: normalizeNullableString(address),
    status,
    searchText: normalizeSearchText(name, email, company, phone),
    notes: normalizeNullableString(notes),
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
      company: normalizedCompany,
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

  await updateClientLogo(id, logo);

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

  await archiveClient(id);

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
  const oldClient = await getClientDocumentOrThrow(id);

  await restoreClient(id);

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
