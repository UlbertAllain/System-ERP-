"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { PaginatedResult } from "@/types/common";
import type { InvoiceDetail, InvoiceListItem } from "@/types/invoice";
import {
  createInvoiceService,
  deleteInvoiceService,
  getInvoiceByIdService,
  listInvoicesPaginatedService,
  issueInvoiceService,
  listInvoicesService,
  updateInvoiceService,
  voidInvoiceService,
} from "@/modules/finance/services/invoice-service";
import {
  createInvoiceSchema,
  invoiceIdSchema,
  listInvoicesSchema,
  updateInvoiceSchema,
  type CreateInvoiceInput,
  type InvoiceIdInput,
  type ListInvoicesInput,
  type UpdateInvoiceInput,
} from "@/modules/finance/schemas/invoice-schema";
import { getAssignedProjectIdsForUser } from "@/modules/projects/actions/project-access-scope";

function revalidateInvoicePaths() {
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

function hasOnlyProjectInvoiceRead(permissions: string[]): boolean {
  return (
    permissions.includes("invoice.read_project") &&
    !permissions.includes("invoice.read") &&
    !permissions.includes("invoice.read_all")
  );
}

function invoiceMatchesFilters(
  invoice: InvoiceListItem,
  payload: ListInvoicesInput,
): boolean {
  const normalizedSearch = payload.search?.trim().toLowerCase();

  if (payload.clientId && invoice.clientId !== payload.clientId) return false;
  if (payload.projectId && invoice.projectId !== payload.projectId) return false;
  if (payload.status && invoice.status !== payload.status) return false;

  if (normalizedSearch) {
    return [
      invoice.invoiceNumber,
      invoice.clientName,
      invoice.clientCompany,
      invoice.projectName,
      invoice.projectCode,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  }

  return true;
}

function paginateInvoices(
  invoices: InvoiceListItem[],
  page: number,
  pageSize: number,
): PaginatedResult<InvoiceListItem> {
  const totalItems = invoices.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const offset = (page - 1) * pageSize;

  return {
    items: invoices.slice(offset, offset + pageSize),
    totalItems,
    page,
    pageSize,
    totalPages,
  };
}

export async function listInvoicesAction(
  input: ListInvoicesInput = {},
): Promise<ActionResponse<InvoiceListItem[]>> {
  try {
    const payload = listInvoicesSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "invoice.read",
      "invoice.read_all",
      "invoice.read_project",
    ]);

    const invoices = await listInvoicesService({
      clientId: payload.clientId,
      projectId: payload.projectId,
      status: payload.status,
    });

    if (hasOnlyProjectInvoiceRead(auth.user.permissions)) {
      const assignedProjectIds = await getAssignedProjectIdsForUser(auth.user);

      return successResponse(
        "Invoices berhasil dimuat.",
        invoices.filter(
          (invoice) =>
            invoice.projectId !== null && assignedProjectIds.has(invoice.projectId),
        ),
      );
    }

    return successResponse("Invoices berhasil dimuat.", invoices);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function listInvoicesPaginatedAction(
  input: ListInvoicesInput = {},
): Promise<ActionResponse<PaginatedResult<InvoiceListItem>>> {
  try {
    const payload = listInvoicesSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "invoice.read",
      "invoice.read_all",
      "invoice.read_project",
    ]);

    if (hasOnlyProjectInvoiceRead(auth.user.permissions)) {
      const [invoices, assignedProjectIds] = await Promise.all([
        listInvoicesService({}),
        getAssignedProjectIdsForUser(auth.user),
      ]);
      const scopedInvoices = invoices
        .filter(
          (invoice) =>
            invoice.projectId !== null && assignedProjectIds.has(invoice.projectId),
        )
        .filter((invoice) => invoiceMatchesFilters(invoice, payload));

      return successResponse(
        "Invoices berhasil dimuat.",
        paginateInvoices(scopedInvoices, payload.page, payload.pageSize),
      );
    }

    const invoices = await listInvoicesPaginatedService({
      search: payload.search,
      clientId: payload.clientId,
      projectId: payload.projectId,
      status: payload.status,
      page: payload.page,
      pageSize: payload.pageSize,
    });

    return successResponse("Invoices berhasil dimuat.", invoices);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getInvoiceByIdAction(
  input: InvoiceIdInput,
): Promise<ActionResponse<InvoiceDetail>> {
  try {
    const payload = invoiceIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, [
      "invoice.read",
      "invoice.read_all",
      "invoice.read_project",
    ]);

    const invoice = await getInvoiceByIdService(payload.id);

    if (
      auth.user.permissions.includes("invoice.read_project") &&
      !auth.user.permissions.includes("invoice.read") &&
      !auth.user.permissions.includes("invoice.read_all")
    ) {
      const assignedProjectIds = await getAssignedProjectIdsForUser(auth.user);

      if (!invoice.projectId || !assignedProjectIds.has(invoice.projectId)) {
        return {
          success: false,
          message: "Akses ditolak untuk invoice ini.",
        };
      }
    }

    return successResponse("Invoice berhasil dimuat.", invoice);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createInvoiceAction(
  input: CreateInvoiceInput,
): Promise<ActionResponse<InvoiceDetail>> {
  try {
    const payload = createInvoiceSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "invoice.create");

    const invoice = await createInvoiceService({
      actor: auth.user,
      ...payload,
    });

    revalidateInvoicePaths();

    return successResponse("Invoice berhasil dibuat.", invoice);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateInvoiceAction(
  input: UpdateInvoiceInput,
): Promise<ActionResponse<InvoiceDetail>> {
  try {
    const payload = updateInvoiceSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "invoice.update");

    const invoice = await updateInvoiceService({
      actor: auth.user,
      ...payload,
    });

    revalidateInvoicePaths();

    return successResponse("Invoice berhasil diperbarui.", invoice);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function issueInvoiceAction(
  input: InvoiceIdInput,
): Promise<ActionResponse<InvoiceDetail>> {
  try {
    const payload = invoiceIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "invoice.change_status");

    const invoice = await issueInvoiceService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateInvoicePaths();

    return successResponse("Invoice berhasil diterbitkan.", invoice);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function voidInvoiceAction(
  input: InvoiceIdInput,
): Promise<ActionResponse<InvoiceDetail>> {
  try {
    const payload = invoiceIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "invoice.change_status");

    const invoice = await voidInvoiceService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateInvoicePaths();

    return successResponse("Invoice berhasil di-void.", invoice);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteInvoiceAction(
  input: InvoiceIdInput,
): Promise<ActionResponse<InvoiceDetail>> {
  try {
    const payload = invoiceIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "invoice.delete");

    const invoice = await deleteInvoiceService({
      actor: auth.user,
      id: payload.id,
    });

    revalidateInvoicePaths();

    return successResponse("Invoice berhasil dihapus.", invoice);
  } catch (error) {
    return handleActionError(error);
  }
}
