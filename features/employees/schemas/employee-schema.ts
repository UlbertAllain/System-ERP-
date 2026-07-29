import { z } from "zod";

export const employeeDepartmentSchema = z.enum([
  "MANAGEMENT",
  "ENGINEERING",
  "UI_UX",
  "QUALITY_ASSURANCE",
  "PRODUCT",
  "MARKETING",
  "SALES",
  "FINANCE",
  "HR",
  "SUPPORT",
]);

export const employmentTypeSchema = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "FREELANCE",
  "INTERNSHIP",
  "CONTRACT",
  "PROBATION",
]);

export const employeeStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "RESIGNED",
  "TERMINATED",
]);

export const createEmployeeSchema = z.object({
  userId: z.string().min(1).nullable().optional(),
  employeeCode: z.string().min(2, "Kode employee minimal 2 karakter.").max(40),
  fullName: z.string().min(2, "Nama minimal 2 karakter.").max(120),
  email: z.string().email("Email tidak valid."),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  position: z.string().min(2, "Position wajib diisi.").max(120),
  department: employeeDepartmentSchema,
  employmentType: employmentTypeSchema,
  joinDate: z.string().min(1, "Join date wajib diisi."),
  emergencyContactName: z.string().max(120).nullable().optional(),
  emergencyContactPhone: z.string().max(30).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateEmployeeSchema = z.object({
  id: z.string().min(1, "Employee ID wajib diisi."),
  userId: z.string().min(1).nullable().optional(),
  employeeCode: z.string().min(2, "Kode employee minimal 2 karakter.").max(40),
  fullName: z.string().min(2, "Nama minimal 2 karakter.").max(120),
  email: z.string().email("Email tidak valid."),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  position: z.string().min(2, "Position wajib diisi.").max(120),
  department: employeeDepartmentSchema,
  employmentType: employmentTypeSchema,
  joinDate: z.string().min(1, "Join date wajib diisi."),
  resignDate: z.string().nullable().optional(),
  status: employeeStatusSchema,
  emergencyContactName: z.string().max(120).nullable().optional(),
  emergencyContactPhone: z.string().max(30).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateOwnEmployeeProfileSchema = z.object({
  id: z.string().min(1, "Employee ID wajib diisi."),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  emergencyContactName: z.string().max(120).nullable().optional(),
  emergencyContactPhone: z.string().max(30).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const employeeIdSchema = z.object({
  id: z.string().min(1, "Employee ID wajib diisi."),
});

export const listEmployeesSchema = z.object({});
export const updateEmployeePhotoSchema = z.object({
  id: z.string().min(1, "Employee ID wajib diisi."),
  photo: z.object({
    url: z.string().url("URL foto tidak valid."),
    publicId: z.string().min(1, "Cloudinary publicId wajib diisi."),
  }),
});
export type UpdateEmployeePhotoInput = z.infer<
  typeof updateEmployeePhotoSchema
>;

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpdateOwnEmployeeProfileInput = z.infer<
  typeof updateOwnEmployeeProfileSchema
>;
export type EmployeeIdInput = z.infer<typeof employeeIdSchema>;
export type ListEmployeesInput = z.infer<typeof listEmployeesSchema>;
