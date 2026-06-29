import { z } from "zod";

export const leaveRequestTypeSchema = z.enum([
  "ANNUAL_LEAVE",
  "SICK_LEAVE",
  "PERMISSION",
  "UNPAID_LEAVE",
  "OTHER",
]);

export const createLeaveRequestSchema = z.object({
  type: leaveRequestTypeSchema,
  startDate: z.string().min(1, "Tanggal mulai wajib diisi."),
  endDate: z.string().min(1, "Tanggal selesai wajib diisi."),
  reason: z.string().min(5, "Alasan minimal 5 karakter.").max(1000),
});

export const updateOwnLeaveRequestSchema = z.object({
  id: z.string().min(1, "Leave request ID wajib diisi."),
  type: leaveRequestTypeSchema,
  startDate: z.string().min(1, "Tanggal mulai wajib diisi."),
  endDate: z.string().min(1, "Tanggal selesai wajib diisi."),
  reason: z.string().min(5, "Alasan minimal 5 karakter.").max(1000),
});

export const leaveRequestIdSchema = z.object({
  id: z.string().min(1, "Leave request ID wajib diisi."),
});

export const rejectLeaveRequestSchema = z.object({
  id: z.string().min(1, "Leave request ID wajib diisi."),
  rejectedReason: z
    .string()
    .min(5, "Alasan penolakan minimal 5 karakter.")
    .max(1000),
});

export const listLeaveRequestsSchema = z.object({});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type UpdateOwnLeaveRequestInput = z.infer<
  typeof updateOwnLeaveRequestSchema
>;
export type LeaveRequestIdInput = z.infer<typeof leaveRequestIdSchema>;
export type RejectLeaveRequestInput = z.infer<typeof rejectLeaveRequestSchema>;
export type ListLeaveRequestsInput = z.infer<typeof listLeaveRequestsSchema>;
