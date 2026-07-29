import { z } from "zod";

export const securePasswordSchema = z
  .string()
  .min(10, "Password minimal 10 karakter.")
  .max(128, "Password maksimal 128 karakter.")
  .regex(/[a-z]/, "Password wajib memiliki huruf kecil.")
  .regex(/[A-Z]/, "Password wajib memiliki huruf besar.")
  .regex(/[0-9]/, "Password wajib memiliki angka.");
