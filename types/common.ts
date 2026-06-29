export type ImageAsset = {
  url: string;
  publicId: string;
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
