"use server";

import { revalidatePath } from "next/cache";

import { createSessionAuthContext } from "@/lib/auth/action-context";
import { handleActionError } from "@/lib/errors/handle-action-error";
import { requirePermission } from "@/lib/permissions/guard";
import { successResponse, type ActionResponse } from "@/lib/response";
import type { PaymentDetail, PaymentListItem } from "@/types/payment";
import {
  cancelPaymentService,
  createPaymentService,
  deletePaymentService,
  getPaymentByIdService,
  listPaymentsService,
  updatePaymentService,
} from "@/features/finance/services/payment-service";
import {
  createPaymentSchema,
  listPaymentsSchema,
  paymentIdSchema,
  updatePaymentSchema,
  type CreatePaymentInput,
  type ListPaymentsInput,
  type PaymentIdInput,
  type UpdatePaymentInput,
} from "@/features/finance/schemas/payment-schema";

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

    requirePermission(auth.user, "payment.read");

    const payments = await listPaymentsService({
      invoiceId: payload.invoiceId,
      clientId: payload.clientId,
      projectId: payload.projectId,
      status: payload.status,
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

    requirePermission(auth.user, "payment.read");

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

export async function updatePaymentAction(
  input: UpdatePaymentInput,
): Promise<ActionResponse<PaymentDetail>> {
  try {
    const payload = updatePaymentSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "payment.update");

    const payment = await updatePaymentService({
      actor: auth.user,
      ...payload,
    });

    revalidatePaymentPaths();

    return successResponse("Payment berhasil diperbarui.", payment);
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

export async function deletePaymentAction(
  input: PaymentIdInput,
): Promise<ActionResponse<PaymentDetail>> {
  try {
    const payload = paymentIdSchema.parse(input);

    const auth = await createSessionAuthContext();

    requirePermission(auth.user, "payment.delete");

    const payment = await deletePaymentService({
      actor: auth.user,
      id: payload.id,
    });

    revalidatePaymentPaths();

    return successResponse("Payment berhasil dihapus.", payment);
  } catch (error) {
    return handleActionError(error);
  }
}
