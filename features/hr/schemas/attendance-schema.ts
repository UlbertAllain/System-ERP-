import { z } from "zod";

export const attendanceStatusSchema = z.enum([
  "PRESENT",
  "LATE",
  "ABSENT",
  "LEAVE",
  "SICK",
  "REMOTE",
]);

export const attendanceRecordIdSchema = z.object({
  id: z.string().min(1, "Attendance ID wajib diisi."),
});

export const clockInSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi.").optional(),
  status: attendanceStatusSchema.default("PRESENT"),
  notes: z.string().max(500).nullable().optional(),
});

export const clockOutSchema = z.object({
  id: z.string().min(1, "Attendance ID wajib diisi."),
  notes: z.string().max(500).nullable().optional(),
});

export const updateAttendanceSchema = z.object({
  id: z.string().min(1, "Attendance ID wajib diisi."),
  date: z.string().min(1, "Tanggal wajib diisi."),
  clockInAt: z.string().nullable().optional(),
  clockOutAt: z.string().nullable().optional(),
  status: attendanceStatusSchema,
  notes: z.string().max(500).nullable().optional(),
});

export const listAttendanceRecordsSchema = z.object({});

export type AttendanceRecordIdInput = z.infer<typeof attendanceRecordIdSchema>;
export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type ListAttendanceRecordsInput = z.infer<
  typeof listAttendanceRecordsSchema
>;
