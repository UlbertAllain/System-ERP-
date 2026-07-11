export type ImageAsset = {
  url: string;
  publicId: string;
};

export type PaginatedResult<T> = {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SoftDeleteFields = {
  deletedAt: Date | null;
};

export type TimestampFields = {
  createdAt: Date;
  updatedAt: Date;
};

export type EntityStatus = "ACTIVE" | "INACTIVE";

export type SelectOption<TValue extends string = string> = {
  label: string;
  value: TValue;
};
