"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { ClientDetail, ClientListItem } from "@/types/client";
import type { PaginatedResult } from "@/types/common";
import {
  createClientService,
  deleteClientService,
  getClientByIdService,
  listClientsPaginatedService,
  listClientsService,
  restoreClientService,
  updateClientService,
  updateClientLogoService,
} from "@/features/clients/services/client-service";
import {
  clientIdSchema,
  createClientSchema,
  listClientsSchema,
  updateClientSchema,
  updateClientLogoSchema,
  type UpdateClientLogoInput,
  type ClientIdInput,
  type CreateClientInput,
  type ListClientsInput,
  type UpdateClientInput,
} from "@/features/clients/schemas/client-schema";

function revalidateClientPaths() {
  revalidatePath("/clients");
}

export async function listClientsAction(
  input: Partial<ListClientsInput> = {},
): Promise<ActionResponse<ClientListItem[]>> {
  try {
    listClientsSchema.partial().parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, ["client.read", "client.read_all"]);

    const clients = await listClientsService();

    return successResponse("Clients berhasil dimuat.", clients);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function listClientsPaginatedAction(
  input: Partial<ListClientsInput> = {},
): Promise<ActionResponse<PaginatedResult<ClientListItem>>> {
  try {
    const payload = listClientsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, ["client.read", "client.read_all"]);

    const clients = await listClientsPaginatedService({
      search: payload.search,
      status: payload.status,
      page: payload.page,
      pageSize: payload.pageSize,
    });

    return successResponse("Clients berhasil dimuat.", clients);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getClientByIdAction(
  input: ClientIdInput,
): Promise<ActionResponse<ClientDetail>> {
  try {
    const payload = clientIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, ["client.read", "client.read_all"]);

    const client = await getClientByIdService(payload.id);

    return successResponse("Client berhasil dimuat.", client);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createClientAction(
  input: CreateClientInput,
): Promise<ActionResponse<ClientDetail>> {
  try {
    const payload = createClientSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "client.create");

    const client = await createClientService({
      actor: auth.user,
      ...payload,
    });

    revalidateClientPaths();

    return successResponse("Client berhasil dibuat.", client);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateClientAction(
  input: UpdateClientInput,
): Promise<ActionResponse<ClientDetail>> {
  try {
    const payload = updateClientSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "client.update");

    const client = await updateClientService({
      actor: auth.user,
      ...payload,
    });

    revalidateClientPaths();

    return successResponse("Client berhasil diperbarui.", client);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateClientLogoAction(
  input: UpdateClientLogoInput,
): Promise<ActionResponse<ClientDetail>> {
  try {
    const payload = updateClientLogoSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "client.logo.update");

    const client = await updateClientLogoService({
      actor: auth.user,
      id: payload.id,
      logo: payload.logo,
    });

    revalidateClientPaths();

    return successResponse("Logo client berhasil diperbarui.", client);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteClientAction(
  input: ClientIdInput,
): Promise<ActionResponse<ClientDetail>> {
  try {
    const payload = clientIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "client.delete");

    const client = await deleteClientService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateClientPaths();

    return successResponse("Client berhasil dihapus.", client);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function restoreClientAction(
  input: ClientIdInput,
): Promise<ActionResponse<ClientDetail>> {
  try {
    const payload = clientIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "client.restore");

    const client = await restoreClientService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateClientPaths();

    return successResponse("Client berhasil direstore.", client);
  } catch (error) {
    return handleActionError(error);
  }
}
