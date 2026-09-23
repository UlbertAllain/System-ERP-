export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "QRIS"
  | "EWALLET"
  | "CARD"
  | "OTHER";

export type PaymentStatus = "CONFIRMED" | "CANCELLED";

export type PaymentListItem = {
  id: string;

  invoiceId: string;
  invoiceNumber: string;

  clientId: string;
  clientName: string;
  clientCompany: string | null;

  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;

  amount: number;
  paymentDate: Date | null;
  method: PaymentMethod;
  status: PaymentStatus;
  referenceNumber: string | null;
  notes: string | null;

  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type PaymentDetail = PaymentListItem;
