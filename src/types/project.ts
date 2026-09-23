import type { ImageAsset } from "@/types/common";

export type ProjectStatus =
  | "PLANNING"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ProjectBillingType =
  | "FIXED_PRICE"
  | "HOURLY"
  | "RETAINER"
  | "INTERNAL";

export type ProjectListItem = {
  id: string;
  projectCode: string;
  name: string;
  description: string | null;
  clientId: string;
  clientName: string;
  clientCompany: string | null;

  picUserId: string | null;
  picEmployeeId: string | null;
  picName: string | null;

  status: ProjectStatus;
  priority: ProjectPriority;
  billingType: ProjectBillingType;
  budget: number;
  startDate: Date | null;
  endDate: Date | null;
  thumbnail: ImageAsset | null;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type ProjectDetail = ProjectListItem;
