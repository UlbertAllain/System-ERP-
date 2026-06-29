import type { ImageAsset } from "@/types/common";

export type EmployeeDepartment =
  | "MANAGEMENT"
  | "ENGINEERING"
  | "UI_UX"
  | "QUALITY_ASSURANCE"
  | "PRODUCT"
  | "MARKETING"
  | "SALES"
  | "FINANCE"
  | "HR"
  | "SUPPORT";

export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "FREELANCE"
  | "INTERNSHIP"
  | "CONTRACT"
  | "PROBATION";

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "RESIGNED" | "TERMINATED";

export type EmployeeListItem = {
  id: string;
  userId: string | null;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  photo: ImageAsset | null;
  position: string;
  department: EmployeeDepartment;
  employmentType: EmploymentType;
  joinDate: Date | null;
  resignDate: Date | null;
  status: EmployeeStatus;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type EmployeeDetail = EmployeeListItem;
