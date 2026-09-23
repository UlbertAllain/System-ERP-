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
import type { PaymentDetail, PaymentListItem } from "@/types/payment";
import {
  cancelPaymentService,
  createPaymentService,
  getPaymentByIdService,
  listPaymentsPaginatedService,
  listPaymentsService,
} from "@/modules/finance/services/payment-service";
import {
  createPaymentSchema,
  listPaymentsSchema,
  paymentIdSchema,
  type CreatePaymentInput,
  type ListPaymentsInput,
  type PaymentIdInput,
} from "@/modules/finance/schemas/payment-schema";

function revalidatePaymentPaths() {
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function listPaymentsAction(
  input: ListPaymentsInput = {},
): Promise<ActionResponse<PaymentListItem[]>> {
  try {
    const payload = listPaymentsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, ["payment.read", "payment.read_all"]);

    const payments = await listPaymentsService({
      invoiceId: payload.invoiceId,
      clientId: payload.clientId,
      projectId: payload.projectId,
      method: payload.method,
      status: payload.status,
    });

    return successResponse("Payments berhasil dimuat.", payments);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function listPaymentsPaginatedAction(
  input: ListPaymentsInput = {},
): Promise<ActionResponse<PaginatedResult<PaymentListItem>>> {
  try {
    const payload = listPaymentsSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, ["payment.read", "payment.read_all"]);

    const payments = await listPaymentsPaginatedService({
      search: payload.search,
      invoiceId: payload.invoiceId,
      clientId: payload.clientId,
      projectId: payload.projectId,
      method: payload.method,
      status: payload.status,
      page: payload.page,
      pageSize: payload.pageSize,
    });

    return successResponse("Payments berhasil dimuat.", payments);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getPaymentByIdAction(
  input: PaymentIdInput,
): Promise<ActionResponse<PaymentDetail>> {
  try {
    const payload = paymentIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requireAnyPermission(auth.user, ["payment.read", "payment.read_all"]);

    const payment = await getPaymentByIdService(payload.id);

    return successResponse("Payment berhasil dimuat.", payment);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createPaymentAction(
  input: CreatePaymentInput,
): Promise<ActionResponse<PaymentDetail>> {
  try {
    const payload = createPaymentSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "payment.create");

    const payment = await createPaymentService({
      actor: auth.user,
      ...payload,
    });

    revalidatePaymentPaths();

    return successResponse("Payment berhasil dibuat.", payment);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function cancelPaymentAction(
  input: PaymentIdInput,
): Promise<ActionResponse<PaymentDetail>> {
  try {
    const payload = paymentIdSchema.parse(input);

    const auth = await createSessionAuthContext();
    requirePermission(auth.user, "payment.cancel");

    const payment = await cancelPaymentService({
      actor: auth.user,
      id: payload.id,
    });

    revalidatePaymentPaths();

    return successResponse("Payment berhasil dibatalkan.", payment);
  } catch (error) {
    return handleActionError(error);
  }
}

