import { ZodError } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { errorResponse, type ActionError } from "@/lib/response";

export function handleActionError(error: unknown): ActionError {
  if (error instanceof AppError) {
    return errorResponse(error.message);
  }

  if (error instanceof ZodError) {
    return errorResponse("Validasi gagal.", error.flatten().fieldErrors);
  }

  if (error instanceof Error) {
    return errorResponse(error.message);
  }

  return errorResponse("Terjadi kesalahan tidak diketahui.");
}
