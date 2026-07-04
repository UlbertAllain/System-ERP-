"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import {
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { InvoiceDetail, InvoiceListItem } from "@/types/invoice";
import {
  createInvoiceService,
  deleteInvoiceService,
  getInvoiceByIdService,
  issueInvoiceService,
  listInvoicesService,
  markInvoicePaidService,
  updateInvoiceService,
  voidInvoiceService,
} from "@/features/finance/services/invoice-service";
import {
  createInvoiceSchema,
  invoiceIdSchema,
  listInvoicesSchema,
  markInvoicePaidSchema,
  updateInvoiceSchema,
  type CreateInvoiceInput,
  type InvoiceIdInput,
  type ListInvoicesInput,
  type MarkInvoicePaidInput,
  type UpdateInvoiceInput,
} from "@/features/finance/schemas/invoice-schema";
import { getAssignedProjectIdsForUser } from "@/features/projects/actions/project-access-scope";

function revalidateInvoicePaths() {
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
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

    if (
      auth.user.permissions.includes("invoice.read_project") &&
      !auth.user.permissions.includes("invoice.read") &&
      !auth.user.permissions.includes("invoice.read_all")
    ) {
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

export async function markInvoicePaidAction(
  input: MarkInvoicePaidInput,
): Promise<ActionResponse<InvoiceDetail>> {
  try {
    const payload = markInvoicePaidSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "invoice.change_status");

    const invoice = await markInvoicePaidService({
      actor: auth.user,
      id: payload.id,
      paidAmount: payload.paidAmount,
    });

    revalidateInvoicePaths();

    return successResponse("Invoice berhasil ditandai paid.", invoice);
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
