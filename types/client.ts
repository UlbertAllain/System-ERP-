import type { ImageAsset } from "@/types/common";

export type ClientStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type ClientListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  website: string | null;
  address: string | null;
  logo: ImageAsset | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type ClientDetail = ClientListItem;
