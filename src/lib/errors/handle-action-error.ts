import { randomUUID } from "crypto";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { errorResponse, type ActionError } from "@/lib/response";

export function handleActionError(error: unknown): ActionError {
  if (error instanceof AppError) {
    return errorResponse(error.message);
  }

  if (error instanceof ZodError) {
    const validationError = error as ZodError;
    return errorResponse(
      "Data yang dikirim belum valid.",
      validationError.flatten().fieldErrors,
    );
  }

  const errorId = randomUUID();
  console.error(`[action-error:${errorId}]`, error);

  return errorResponse(
    `Terjadi kesalahan saat memproses permintaan. Kode error: ${errorId}`,
  );
}
